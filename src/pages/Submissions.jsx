import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function Submissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [type, setType] = useState('github_link');
  const [githubUrl, setGithubUrl] = useState('');
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [annotationDrafts, setAnnotationDrafts] = useState({});
  const [annotatingSubmissionId, setAnnotatingSubmissionId] = useState(null);

  useEffect(() => {
    apiRequest('/api/submissions')
      .then((data) => setSubmissions(data.data || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));

    if (user?.profile_type === 'candidate') {
      apiRequest('/api/bookings')
        .then((data) => {
          const all = data.data || [];
          const mine = all.filter((b) => Number(b?.candidate?.user?.id) === Number(user?.id));
          setBookings(mine);
        })
        .catch(() => setBookings([]));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const requestBody = type === 'file'
        ? (() => {
            const formData = new FormData();
            formData.append('type', 'file');
            if (file) formData.append('file', file);
            if (selectedBookingId) formData.append('booking_id', String(selectedBookingId));
            if (notes) formData.append('notes', notes);
            return formData;
          })()
        : JSON.stringify({
            type,
            github_url: githubUrl,
            booking_id: selectedBookingId || undefined,
            notes: notes || undefined,
          });

      const created = await apiRequest('/api/submissions', {
        method: 'POST',
        body: requestBody,
      });
      setMessage('Submission added.');
      setGithubUrl('');
      setFile(null);
      setSelectedBookingId('');
      setNotes('');
      setSubmissions((prev) => [created, ...prev]);
    } catch (err) {
      setMessage(err.body?.message || err.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnnotate = async (submissionId) => {
    const body = String(annotationDrafts[submissionId] || '').trim();
    if (!body) return;
    setAnnotatingSubmissionId(submissionId);
    setMessage('');
    try {
      const created = await apiRequest(`/api/submissions/${submissionId}/annotations`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      setSubmissions((current) => current.map((submission) => (
        Number(submission.id) === Number(submissionId)
          ? {
              ...submission,
              annotations: [...(submission.annotations || []), created],
            }
          : submission
      )));
      setAnnotationDrafts((current) => ({ ...current, [submissionId]: '' }));
      setMessage('Annotation added.');
    } catch (err) {
      setMessage(err.body?.message || err.message || 'Unable to add annotation');
    } finally {
      setAnnotatingSubmissionId(null);
    }
  };

  return (
    <div className="booking-page">
      <h1 className="booking-title">Coding challenge submissions</h1>
      <p className="booking-subtitle">Share your GitHub solution or upload a file for interviewer feedback.</p>

      {user?.profile_type === 'candidate' && (
        <form onSubmit={handleSubmit} className="booking-form-card">
          <h2 className="booking-section-title">Add submission</h2>

        <div className="booking-grid">
          <div>
            <label className="booking-label">Choose booking</label>
            <select
              className="booking-input"
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              required
            >
              <option value="">Select booking</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.id} - {b.interviewer?.user?.name || 'Interviewer'} - {new Date(b.scheduled_at).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="booking-label">Submission type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="booking-input"
            >
              <option value="github_link">GitHub link</option>
              <option value="file">File upload</option>
            </select>
          </div>

          {type === 'github_link' && (
            <div>
              <label className="booking-label">GitHub URL</label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                className="booking-input"
                required
              />
            </div>
          )}

          {type === 'file' && (
            <div>
              <label className="booking-label">Upload file</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="booking-input"
                required
              />
              {file && <span className="booking-card-meta">{file.name}</span>}
            </div>
          )}
        </div>

        <div style={{ marginTop: '10px' }}>
          <label className="booking-label">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="booking-input"
            rows={3}
          />
        </div>

          <button
            type="submit"
            disabled={submitting}
            className="booking-submit"
          >
            {submitting ? 'Submitting...' : 'Submit solution'}
          </button>
        </form>
      )}

      {message && <p className={message.toLowerCase().includes('failed') ? 'booking-error' : 'booking-success'}>{message}</p>}

      <div>
        <h2 className="booking-section-title">My submissions</h2>
        {loading ? (
          <p className="booking-empty">Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <p className="booking-empty">No submissions yet.</p>
        ) : (
          <ul className="booking-list">
            {submissions.map((s) => (
              <li key={s.id} className="booking-card">
                <div className="booking-card-header">
                  <span className="booking-card-title">{s.type === 'github_link' ? 'GitHub link' : 'File upload'}</span>
                  <span className="booking-card-meta">{new Date(s.created_at).toLocaleString()}</span>
                </div>
                {s.github_url && (
                  <a href={s.github_url} target="_blank" rel="noopener noreferrer" className="booking-action-btn" style={{ display: 'inline-block', marginTop: '8px' }}>
                    Open GitHub link
                  </a>
                )}
                {s.notes && <p className="booking-card-meta">{s.notes}</p>}

                <div style={{ marginTop: '10px' }}>
                  <p className="booking-label">Annotations</p>
                  {Array.isArray(s.annotations) && s.annotations.length > 0 ? (
                    <div className="booking-list" style={{ marginTop: '6px' }}>
                      {s.annotations.map((annotation) => (
                        <div key={annotation.id} className="booking-card" style={{ padding: '10px' }}>
                          <div className="booking-card-header">
                            <span className="booking-card-title">
                              {annotation.interviewer?.user?.name || 'Interviewer'}
                            </span>
                            <span className="booking-card-meta">
                              {annotation.created_at ? new Date(annotation.created_at).toLocaleString() : ''}
                            </span>
                          </div>
                          <p className="booking-card-meta" style={{ color: '#334155', fontSize: '14px' }}>{annotation.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="booking-empty">No annotations yet.</p>
                  )}
                </div>

                {user?.profile_type === 'interviewer' && (
                  <div style={{ marginTop: '10px' }}>
                    <label className="booking-label">Add annotation</label>
                    <textarea
                      className="booking-input"
                      rows={2}
                      value={annotationDrafts[s.id] || ''}
                      onChange={(e) => setAnnotationDrafts((current) => ({ ...current, [s.id]: e.target.value }))}
                      placeholder="Write feedback on this submission..."
                    />
                    <button
                      type="button"
                      className="booking-submit"
                      onClick={() => handleAnnotate(s.id)}
                      disabled={annotatingSubmissionId === s.id || !String(annotationDrafts[s.id] || '').trim()}
                    >
                      {annotatingSubmissionId === s.id ? 'Saving...' : 'Save annotation'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
