import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function InterviewHistory() {
  const { user } = useAuth();
  const [recordingDrafts, setRecordingDrafts] = useState({});
  const [savingRecordingFor, setSavingRecordingFor] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/interviews')
      .then((data) => setInterviews(data.data || []))
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const saveRecordingUrl = async (interviewId) => {
    const url = String(recordingDrafts[interviewId] || '').trim();
    if (!url) return;
    setSavingRecordingFor(interviewId);
    setError('');
    try {
      const updated = await apiRequest(`/api/interviews/${interviewId}/recording`, {
        method: 'PATCH',
        body: JSON.stringify({ recording_url: url }),
      });
      setInterviews((current) => current.map((i) => (Number(i.id) === Number(interviewId) ? updated : i)));
      setRecordingDrafts((current) => ({ ...current, [interviewId]: '' }));
    } catch (e) {
      setError(e.body?.message || 'Unable to save recording URL.');
    } finally {
      setSavingRecordingFor(null);
    }
  };

  if (loading) return <p className="booking-empty">Loading interview history...</p>;
  if (error) return <p className="booking-error">{error}</p>;

  return (
    <div className="booking-page">
      <h1 className="booking-title">Interview history</h1>
      <p className="booking-subtitle">Past mock interviews and structured evaluation reports.</p>
      {interviews.length === 0 ? (
        <p className="booking-empty">No interviews yet.</p>
      ) : (
        <ul className="booking-list">
          {interviews.map((i) => (
            <li key={i.id} className="booking-card">
              <div className="booking-card-header">
                <span className="booking-card-title">
                  {i.booking?.interviewer?.user?.name ?? 'Interviewer'} – {i.booking?.scheduled_at ? new Date(i.booking.scheduled_at).toLocaleString() : 'N/A'}
                </span>
                {i.evaluation && <span className="booking-status status-completed">Evaluated</span>}
              </div>
              {i.started_at && <p className="booking-card-meta">Started: {new Date(i.started_at).toLocaleString()}</p>}

              <div className="booking-form-card" style={{ marginTop: '10px' }}>
                <p className="booking-section-title" style={{ marginBottom: '6px' }}>Interview recording</p>
                {i.recording_url ? (
                  <>
                    <video
                      controls
                      className="live-video"
                      style={{ minHeight: '180px' }}
                      src={i.recording_url}
                    />
                    <a
                      href={i.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="booking-action-btn"
                      style={{ display: 'inline-block', marginTop: '8px' }}
                    >
                      Open recording link
                    </a>
                  </>
                ) : (
                  <p className="booking-empty">No recording uploaded yet.</p>
                )}

                {Number(i.booking?.interviewer?.user?.id) === Number(user?.id) && (
                  <div style={{ marginTop: '10px' }}>
                    <label className="booking-label">Set recording URL (interviewer)</label>
                    <input
                      type="url"
                      className="booking-input"
                      placeholder="https://..."
                      value={recordingDrafts[i.id] || ''}
                      onChange={(e) => setRecordingDrafts((current) => ({ ...current, [i.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="booking-submit"
                      onClick={() => saveRecordingUrl(i.id)}
                      disabled={savingRecordingFor === i.id || !String(recordingDrafts[i.id] || '').trim()}
                    >
                      {savingRecordingFor === i.id ? 'Saving...' : 'Save recording URL'}
                    </button>
                  </div>
                )}
              </div>

              {i.evaluation && (
                <div className="booking-form-card" style={{ marginTop: '10px' }}>
                  <p className="booking-section-title" style={{ marginBottom: '6px' }}>Evaluation report</p>
                  {i.evaluation.submitted_at && (
                    <p className="booking-card-meta">Submitted: {new Date(i.evaluation.submitted_at).toLocaleString()}</p>
                  )}
                  {i.evaluation.scores && Object.keys(i.evaluation.scores).length > 0 && (
                    <div className="booking-list" style={{ marginTop: '8px' }}>
                      {Object.entries(i.evaluation.scores).map(([category, value]) => (
                        <div key={category} className="booking-card" style={{ padding: '10px' }}>
                          <span className="booking-card-title">{category}</span>
                          <span className="booking-card-meta">Score: {String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="booking-card-meta" style={{ marginTop: '8px' }}>
                    <strong>Feedback:</strong> {i.evaluation.feedback}
                  </p>
                </div>
              )}
              {!i.evaluation && <p className="booking-empty">Evaluation pending.</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
