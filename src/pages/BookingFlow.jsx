import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function BookingFlow() {
  const { user, loading: authLoading } = useAuth();
  const [interviewers, setInterviewers] = useState([]);
  const [domain, setDomain] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [availabilityFrom, setAvailabilityFrom] = useState('');
  const [minRating, setMinRating] = useState('');
  const [badge, setBadge] = useState('');
  const [selected, setSelected] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchInterviewers = async ({ isInitial = false } = {}) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setSearching(true);
    }
    setError('');
    try {
      const params = new URLSearchParams();
      if (domain) params.set('domain', domain);
      if (interviewType) params.set('interview_type', interviewType);
      if (experienceLevel) params.set('experience_level', experienceLevel);
      if (availabilityFrom) params.set('availability_from', new Date(availabilityFrom).toISOString());
      if (minRating) params.set('min_rating', minRating);
      if (badge) params.set('badge', badge);
      const query = params.toString();
      const path = query ? `/api/interviewers?${query}` : '/api/interviewers';
      const data = await apiRequest(path);
      const next = data.data ?? [];
      setInterviewers(next);
      if (selected && !next.some((i) => i.id === selected.id)) {
        setSelected(null);
      }
    } catch (e) {
      setInterviewers([]);
      setError(e.body?.message || 'Unable to load interviewers');
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setSearching(false);
      }
    }
  };

  useEffect(() => {
    fetchInterviewers({ isInitial: true });
  }, []);

  const handleBook = async () => {
    if (!selected || !scheduledAt) return;
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      await apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          interviewer_id: selected.id,
          scheduled_at: new Date(scheduledAt).toISOString(),
        }),
      });
      setMessage('Booking request sent.');
      setSelected(null);
      setScheduledAt('');
    } catch (e) {
      setError(e.body?.message || e.body?.scheduled_at?.[0] || 'Booking request failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <p>Loading interviewers...</p>;

  if (!user) {
    return (
      <div className="booking-page">
        <h1 className="booking-title">Book a mock interview</h1>
        <p className="booking-error">Please sign in again to continue.</p>
      </div>
    );
  }

  if (user.profile_type && user.profile_type !== 'candidate') {
    return (
      <div className="booking-page">
        <h1 className="booking-title">Book a mock interview</h1>
        <p className="booking-error">
          This page is for <strong>candidates</strong> who want to request a mock interview. As an interviewer, you
          manage incoming requests on <Link to="/bookings">My bookings</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <h1 className="booking-title">Book a mock interview</h1>
      <p className="booking-subtitle">Select an interviewer and choose a preferred time.</p>
      <div className="booking-form-card" style={{ marginBottom: '1rem' }}>
        <h2 className="booking-section-title">Search filters</h2>
        <div className="booking-grid">
          <div>
            <label className="booking-label">Domain</label>
            <select className="booking-input" value={domain} onChange={(e) => setDomain(e.target.value)}>
              <option value="">Any</option>
              <option value="Backend">Backend</option>
              <option value="Frontend">Frontend</option>
              <option value="DevOps">DevOps</option>
              <option value="AI/ML">AI/ML</option>
              <option value="Mobile">Mobile</option>
            </select>
          </div>
          <div>
            <label className="booking-label">Interview type</label>
            <select className="booking-input" value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
              <option value="">Any</option>
              <option value="DSA">DSA</option>
              <option value="System Design">System Design</option>
              <option value="Behavioral">Behavioral</option>
            </select>
          </div>
          <div>
            <label className="booking-label">Experience level</label>
            <select className="booking-input" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
              <option value="">Any</option>
              <option value="Senior">Senior</option>
              <option value="Staff">Staff</option>
              <option value="Principal">Principal</option>
            </select>
          </div>
          <div>
            <label className="booking-label">Available from</label>
            <input
              type="datetime-local"
              className="booking-input"
              value={availabilityFrom}
              onChange={(e) => setAvailabilityFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="booking-label">Minimum rating</label>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              className="booking-input"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              placeholder="e.g. 4.5"
            />
          </div>
          <div>
            <label className="booking-label">Specialization badge</label>
            <input
              type="text"
              className="booking-input"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="e.g. System Design Expert"
            />
          </div>
        </div>
        <div className="live-actions" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="booking-submit" onClick={() => fetchInterviewers()} disabled={searching}>
            {searching ? 'Searching...' : 'Apply filters'}
          </button>
          <button
            type="button"
            className="booking-action-btn"
            onClick={() => {
              setDomain('');
              setInterviewType('');
              setExperienceLevel('');
              setAvailabilityFrom('');
              setMinRating('');
              setBadge('');
            }}
            disabled={searching}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="booking-grid">
        <div>
          <h2 className="booking-section-title">Available interviewers</h2>
          <ul className="booking-list">
            {interviewers.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setSelected(i)}
                  className={`booking-interviewer-btn ${selected?.id === i.id ? 'is-selected' : ''}`}
                >
                  <span className="booking-interviewer-name">{i.user?.name ?? 'Interviewer'}</span>
                  {i.experience_level && <span className="booking-interviewer-meta">{i.experience_level}</span>}
                  {i.hourly_rate != null && <span className="booking-interviewer-rate">${i.hourly_rate}/hr</span>}
                </button>
              </li>
            ))}
          </ul>
          {interviewers.length === 0 && <p className="booking-empty">No interviewers found.</p>}
        </div>
        <div className="booking-form-card">
          {selected && (
            <>
              <p className="booking-selection">
                Booking with <strong>{selected.user?.name ?? 'Interviewer'}</strong>
              </p>
              <label className="booking-label">Scheduled date & time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="booking-input"
              />
              <button
                type="button"
                onClick={handleBook}
                disabled={submitting || !scheduledAt}
                className="booking-submit"
              >
                {submitting ? 'Booking...' : 'Request booking'}
              </button>
            </>
          )}
          {!selected && <p className="booking-empty">Pick an interviewer to continue.</p>}
        </div>
      </div>
      {message && <p className="booking-success">{message}</p>}
      {error && <p className="booking-error">{error}</p>}
    </div>
  );
}
