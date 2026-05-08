import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const [interviewers, setInterviewers] = useState([]);
  const [interviewerIdToStart, setInterviewerIdToStart] = useState('');
  const [startingConversation, setStartingConversation] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((c) => Number(c.id) === Number(selectedConversationId)) || null,
    [conversations, selectedConversationId]
  );

  const conversationPeerName = (conversation) => {
    if (!conversation) return 'Conversation';
    if (Number(conversation.candidate?.user?.id) === Number(user?.id)) {
      return conversation.interviewer?.user?.name || 'Interviewer';
    }
    return conversation.candidate?.user?.name || 'Candidate';
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    setError('');
    try {
      const data = await apiRequest('/api/conversations');
      const list = data.data ?? [];
      setConversations(list);
      if (!selectedConversationId && list.length > 0) {
        setSelectedConversationId(list[0].id);
      }
    } catch (e) {
      setError(e.body?.message || 'Unable to load conversations.');
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    setError('');
    try {
      const data = await apiRequest(`/api/conversations/${conversationId}/messages`);
      // Backend returns latest first; show oldest -> newest in UI.
      const list = [...(data.data ?? [])].reverse();
      setMessages(list);
    } catch (e) {
      setError(e.body?.message || 'Unable to load messages.');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadInterviewers = async () => {
    if (user?.profile_type !== 'candidate') return;
    try {
      const data = await apiRequest('/api/interviewers');
      setInterviewers(data.data ?? []);
    } catch {
      setInterviewers([]);
    }
  };

  useEffect(() => {
    loadConversations();
    loadInterviewers();
  }, []);

  useEffect(() => {
    loadMessages(selectedConversationId);
  }, [selectedConversationId]);

  const handleStartConversation = async () => {
    if (!interviewerIdToStart) return;
    setStartingConversation(true);
    setError('');
    try {
      const conversation = await apiRequest('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ interviewer_id: Number(interviewerIdToStart) }),
      });
      setConversations((current) => {
        const exists = current.some((c) => Number(c.id) === Number(conversation.id));
        return exists ? current : [conversation, ...current];
      });
      setSelectedConversationId(conversation.id);
      setInterviewerIdToStart('');
    } catch (e) {
      setError(e.body?.message || 'Unable to start conversation.');
    } finally {
      setStartingConversation(false);
    }
  };

  const handleSend = async () => {
    const text = composer.trim();
    if (!selectedConversationId || !text) return;
    setSending(true);
    setError('');
    try {
      const created = await apiRequest(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: text }),
      });
      setMessages((current) => [...current, created]);
      setComposer('');
      await loadConversations();
    } catch (e) {
      setError(e.body?.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="booking-page">
      <h1 className="booking-title">Messages</h1>
      <p className="booking-subtitle">Chat with interviewers and candidates about upcoming sessions.</p>
      {error && <p className="booking-error">{error}</p>}

      {user?.profile_type === 'candidate' && (
        <div className="booking-form-card">
          <h2 className="booking-section-title">Start conversation</h2>
          <div className="booking-grid">
            <div>
              <label className="booking-label">Choose interviewer</label>
              <select
                className="booking-input"
                value={interviewerIdToStart}
                onChange={(e) => setInterviewerIdToStart(e.target.value)}
              >
                <option value="">Select interviewer</option>
                {interviewers.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.user?.name || 'Interviewer'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            className="booking-submit"
            onClick={handleStartConversation}
            disabled={startingConversation || !interviewerIdToStart}
          >
            {startingConversation ? 'Starting...' : 'Start conversation'}
          </button>
        </div>
      )}

      <div className="booking-grid">
        <div>
          <h2 className="booking-section-title">Conversations</h2>
          {loadingConversations ? (
            <p className="booking-empty">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <p className="booking-empty">No conversations yet.</p>
          ) : (
            <ul className="booking-list">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`booking-interviewer-btn ${Number(c.id) === Number(selectedConversationId) ? 'is-selected' : ''}`}
                    onClick={() => setSelectedConversationId(c.id)}
                  >
                    <span className="booking-interviewer-name">{conversationPeerName(c)}</span>
                    <span className="booking-interviewer-meta">Conversation #{c.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="booking-form-card">
          <h2 className="booking-section-title">
            {selectedConversation ? `Chat with ${conversationPeerName(selectedConversation)}` : 'Messages'}
          </h2>

          {!selectedConversationId ? (
            <p className="booking-empty">Choose a conversation to start chatting.</p>
          ) : (
            <>
              <div className="booking-list" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {loadingMessages ? (
                  <p className="booking-empty">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="booking-empty">No messages yet.</p>
                ) : (
                  messages.map((m) => {
                    const mine = Number(m.user_id) === Number(user?.id);
                    return (
                      <div
                        key={m.id}
                        className="booking-card"
                        style={{
                          background: mine ? '#eef2ff' : '#ffffff',
                          borderColor: mine ? '#c7d2fe' : '#e2e8f0',
                        }}
                      >
                        <div className="booking-card-header">
                          <span className="booking-card-title">{m.user?.name || (mine ? 'You' : 'Participant')}</span>
                          <span className="booking-card-meta">{new Date(m.created_at).toLocaleString()}</span>
                        </div>
                        <p className="booking-card-meta" style={{ marginTop: '6px', color: '#334155', fontSize: '14px' }}>{m.body}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ marginTop: '10px' }}>
                <label className="booking-label">Type message</label>
                <textarea
                  className="booking-input"
                  rows={3}
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="Write your message..."
                />
                <button
                  type="button"
                  className="booking-submit"
                  onClick={handleSend}
                  disabled={sending || !composer.trim()}
                >
                  {sending ? 'Sending...' : 'Send message'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
