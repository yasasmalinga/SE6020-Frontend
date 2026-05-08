import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

function buildRtcConfiguration() {
  const raw = import.meta.env.VITE_ICE_SERVERS_JSON;
  let iceServers = DEFAULT_ICE_SERVERS;
  if (raw && typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        iceServers = parsed;
      }
    } catch {
      // ignore invalid JSON
    }
  }
  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
}

/** Wait so localDescription.sdp includes host/srflx candidates (helps when trickle HTTP is slow). */
function waitForIceGatheringComplete(pc, timeoutMs = 12000) {
  if (pc.iceGatheringState === 'complete') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', onChange);
      window.clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete' || pc.connectionState === 'closed') {
        done();
      }
    };
    pc.addEventListener('icegatheringstatechange', onChange);
    const timer = window.setTimeout(done, timeoutMs);
  });
}

async function acquireLocalMedia() {
  const constraintsList = [
    { video: true, audio: true },
    { video: true, audio: false },
  ];
  let lastErr = null;
  for (const constraints of constraintsList) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastErr = err;
    }
  }
  const name = lastErr?.name || 'Error';
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    throw new Error(
      'Camera or mic is in use by another tab or app. Close other meetings/tabs using the camera, then try again.'
    );
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    throw new Error('Camera/mic permission denied. Allow access for this site in the browser address bar.');
  }
  if (name === 'NotFoundError') {
    throw new Error('No camera found. Plug in a camera or allow a virtual camera, then retry.');
  }
  throw new Error(lastErr?.message || 'Could not start video source');
}

/** RFC 4566 uses CRLF; LF-only SDPs from JSON/API can confuse Chrome's parser (e.g. a=ssrc-group:FID errors). */
function normalizeSdpLineEndings(sdp) {
  if (!sdp || typeof sdp !== 'string') return sdp;
  const lines = sdp.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return `${lines.join('\r\n')}\r\n`;
}

/** Simulcast FID lines sometimes fail cross-browser; stripping keeps a single working video/audio flow. */
function stripSsrcGroupFidLines(sdp) {
  if (!sdp || typeof sdp !== 'string') return sdp;
  const lines = sdp.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return `${lines.filter((line) => !/^a=ssrc-group:FID\b/i.test(line)).join('\r\n')}\r\n`;
}

async function setRemoteDescriptionSafe(pc, descriptionInit) {
  if (!descriptionInit?.sdp) {
    await pc.setRemoteDescription(descriptionInit);
    return;
  }
  const base = { type: descriptionInit.type, sdp: normalizeSdpLineEndings(descriptionInit.sdp) };
  try {
    await pc.setRemoteDescription(base);
  } catch (firstErr) {
    const fallback = { type: descriptionInit.type, sdp: stripSsrcGroupFidLines(descriptionInit.sdp) };
    if (fallback.sdp === base.sdp) {
      throw firstErr;
    }
    try {
      await pc.setRemoteDescription(fallback);
    } catch {
      throw firstErr;
    }
  }
}

export default function LiveSession() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [sessionId, setSessionId] = useState(searchParams.get('sessionId'));
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [session, setSession] = useState(null);
  const [connectionState, setConnectionState] = useState('new');
  const [iceConnectionState, setIceConnectionState] = useState('new');
  const [iceGatheringState, setIceGatheringState] = useState('new');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pollTimerRef = useRef(null);
  const sessionIdRef = useRef(searchParams.get('sessionId'));
  const addedCandidatesRef = useRef(new Set());
  const isOffererRef = useRef(false);
  const roleRef = useRef(user?.profile_type || 'candidate');

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    roleRef.current = user?.profile_type || 'candidate';
  }, [user?.profile_type]);

  useEffect(() => {
    if (sessionId) {
      startPolling(sessionId);
    }
    return () => {
      stopPolling();
    };
  }, [sessionId]);

  useEffect(() => {
    return () => {
      stopPolling();
      cleanupCall();
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const startPolling = (id) => {
    stopPolling();
    pollSession(id);
    pollTimerRef.current = window.setInterval(() => {
      pollSession(id);
    }, 2000);
  };

  const createPeerConnection = async () => {
    if (peerRef.current) return peerRef.current;

    const pc = new RTCPeerConnection(buildRtcConfiguration());
    peerRef.current = pc;
    setConnectionState(pc.connectionState);
    setIceConnectionState(pc.iceConnectionState);
    setIceGatheringState(pc.iceGatheringState);

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      setIceConnectionState(pc.iceConnectionState);
    };

    pc.onicegatheringstatechange = () => {
      setIceGatheringState(pc.iceGatheringState);
    };

    pc.onicecandidate = async (event) => {
      const activeSessionId = sessionIdRef.current;
      if (!event.candidate || !activeSessionId) return;
      try {
        await apiRequest(`/api/interaction/realtime/sessions/${activeSessionId}/ice-candidates`, {
          method: 'POST',
          body: JSON.stringify({
            candidate: {
              ...event.candidate.toJSON(),
              sender_user_id: user?.id ?? null,
            },
          }),
        });
      } catch {
        // Continue even if a candidate push fails; next poll can recover.
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    const stream = await acquireLocalMedia();
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    return pc;
  };

  const pollSession = async (id) => {
    try {
      const data = await apiRequest(`/api/interaction/realtime/sessions/${id}`);
      setSession(data);
      await applyRemoteState(data);
    } catch (e) {
      setError(
        e.body?.message || e.message || `Unable to fetch live session state (${e.status || 'network'}).`
      );
      stopPolling();
    }
  };

  const applyRemoteState = async (currentSession) => {
    const pc = peerRef.current;
    if (!pc) return;

    if (!pc.currentRemoteDescription && currentSession.offer_sdp && !isOffererRef.current) {
      await setRemoteDescriptionSafe(pc, { type: 'offer', sdp: currentSession.offer_sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGatheringComplete(pc);
      const answerSdp = normalizeSdpLineEndings(pc.localDescription?.sdp || answer.sdp);
      await apiRequest(`/api/interaction/realtime/sessions/${currentSession.id}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answer_sdp: answerSdp }),
      });
      setStatus('Connected (answer sent)');
    }

    if (
      isOffererRef.current &&
      !pc.currentRemoteDescription &&
      currentSession.answer_sdp &&
      pc.localDescription?.type === 'offer'
    ) {
      await setRemoteDescriptionSafe(pc, { type: 'answer', sdp: currentSession.answer_sdp });
      setStatus('Connected');
    }

    const iceCandidates = Array.isArray(currentSession.ice_candidates)
      ? currentSession.ice_candidates
      : JSON.parse(currentSession.ice_candidates || '[]');

    for (const candidate of iceCandidates) {
      const key = `${candidate.candidate}|${candidate.sdpMid}|${candidate.sdpMLineIndex}`;
      if (addedCandidatesRef.current.has(key)) continue;
      if (candidate.sender_user_id && user?.id && Number(candidate.sender_user_id) === Number(user.id)) {
        continue;
      }
      try {
        await pc.addIceCandidate(candidate);
        addedCandidatesRef.current.add(key);
      } catch {
        // Ignore malformed/duplicate candidates.
      }
    }
  };

  const handleStart = async () => {
    if (!bookingId && !sessionId) {
      setError('Open this page from an accepted booking, or provide a sessionId.');
      return;
    }

    setConnecting(true);
    setError('');
    setStatus('Connecting...');
    try {
      let activeSessionId = sessionId;
      if (activeSessionId) {
        const existing = await apiRequest(`/api/interaction/realtime/sessions/${activeSessionId}`);
        if (existing.status === 'ended') {
          if (!bookingId) {
            setError('This session has ended. Open from a booking to start a new one.');
            setStatus('Ended');
            return;
          }
          activeSessionId = null;
          setSessionId(null);
          setSession(null);
        }
      }

      if (!activeSessionId) {
        const created = await apiRequest('/api/interaction/realtime/sessions', {
          method: 'POST',
          body: JSON.stringify({
            booking_id: Number(bookingId),
            force_new: status === 'Failed',
          }),
        });
        activeSessionId = String(created.id);
        sessionIdRef.current = activeSessionId;
        setSessionId(activeSessionId);
        setSession(created);
      }

      sessionIdRef.current = activeSessionId;
      setSessionId(activeSessionId);

      let bookingMeta = null;
      if (bookingId) {
        try {
          bookingMeta = await apiRequest(`/api/bookings/${bookingId}`);
        } catch {
          bookingMeta = null;
        }
      }
      const amCandidateOnBooking =
        Boolean(bookingMeta?.candidate?.user?.id) &&
        Number(bookingMeta.candidate.user.id) === Number(user?.id);

      const pc = await createPeerConnection();
      const currentSession = await apiRequest(`/api/interaction/realtime/sessions/${activeSessionId}`);
      setSession(currentSession);

      if (!currentSession.offer_sdp) {
        // With a booking: candidate sends offer, interviewer answers (stable signaling).
        // Session-only URL (no bookingId): first join creates the offer (legacy).
        const shouldSendOffer = !bookingId
          ? true
          : bookingMeta
            ? amCandidateOnBooking
            : user?.profile_type !== 'interviewer';

        if (shouldSendOffer) {
          isOffererRef.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await waitForIceGatheringComplete(pc);
          const offerSdp = normalizeSdpLineEndings(pc.localDescription?.sdp || offer.sdp);
          await apiRequest(`/api/interaction/realtime/sessions/${activeSessionId}/offer`, {
            method: 'POST',
            body: JSON.stringify({ offer_sdp: offerSdp }),
          });
          setStatus('Waiting for interviewer to join...');
        } else {
          isOffererRef.current = false;
          setStatus('Waiting for candidate to start video (they send the connection offer)...');
        }
      } else {
        isOffererRef.current = false;
        await applyRemoteState(currentSession);
        setStatus('Joining existing session...');
      }
    } catch (e) {
      setError(e.body?.message || e.message || 'Failed to start live session.');
      setStatus('Failed');
    } finally {
      setConnecting(false);
    }
  };

  const cleanupCall = () => {
    if (peerRef.current) {
      peerRef.current.onicecandidate = null;
      peerRef.current.ontrack = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.oniceconnectionstatechange = null;
      peerRef.current.onicegatheringstatechange = null;
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    addedCandidatesRef.current.clear();
    isOffererRef.current = false;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setConnectionState('closed');
    setIceConnectionState('closed');
    setIceGatheringState('complete');
  };

  const handleEnd = async () => {
    try {
      if (sessionId) {
        await apiRequest(`/api/interaction/realtime/sessions/${sessionId}/end`, { method: 'POST' });
      }
    } catch {
      // Local cleanup still required even if server call fails.
    }
    cleanupCall();
    stopPolling();
    setSessionId(null);
    sessionIdRef.current = null;
    setSession(null);
    setStatus('Ended');
  };

  const handleRestart = async () => {
    if (!bookingId) {
      setError('Cannot restart without a booking ID.');
      return;
    }

    try {
      if (sessionIdRef.current) {
        await apiRequest(`/api/interaction/realtime/sessions/${sessionIdRef.current}/end`, { method: 'POST' });
      }
    } catch {
      // Keep going; local reset + force_new handles stale sessions.
    }

    cleanupCall();
    stopPolling();
    setSessionId(null);
    sessionIdRef.current = null;
    setSession(null);
    setError('');
    setStatus('Failed');
    await handleStart();
  };

  return (
    <div className="live-page">
      <h1 className="booking-title">Live interview session</h1>
      <p className="booking-subtitle">
        Start or join a WebRTC session for booking <strong>{bookingId || session?.booking_id || '-'}</strong>.
      </p>

      {error && <p className="booking-error">{error}</p>}
      <p className="live-status">Status: {status}</p>
      <p className="live-status">
        WebRTC: conn={connectionState} | ice={iceConnectionState} | gather={iceGatheringState}
      </p>

      <div className="live-actions">
        <button type="button" onClick={handleStart} className="booking-submit" disabled={connecting}>
          {connecting ? 'Connecting...' : 'Start / Join session'}
        </button>
        <button type="button" onClick={handleEnd} className="booking-action-btn reject">
          End session
        </button>
        <button type="button" onClick={handleRestart} className="booking-action-btn">
          Restart session
        </button>
        <Link className="booking-action-btn" to="/bookings">Back to bookings</Link>
      </div>

      {sessionId && (
        <p className="booking-card-meta">
          Session ID: <strong>{sessionId}</strong>
        </p>
      )}

      <div className="live-grid">
        <div className="live-video-card">
          <h2>Your camera</h2>
          <video ref={localVideoRef} autoPlay muted playsInline className="live-video" />
        </div>
        <div className="live-video-card">
          <h2>Peer camera</h2>
          <video ref={remoteVideoRef} autoPlay playsInline className="live-video" />
        </div>
      </div>
    </div>
  );
}
