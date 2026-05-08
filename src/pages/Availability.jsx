import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function Availability() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSlots = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/availability');
      setSlots(data.data ?? []);
    } catch (e) {
      setError(e.body?.message || 'Unable to load availability slots.');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiRequest('/api/availability', {
        method: 'POST',
        body: JSON.stringify({
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
        }),
      });
      setMessage('Availability slot published.');
      setStartAt('');
      setEndAt('');
      await loadSlots();
    } catch (e2) {
      setError(
        e2.body?.message
          || e2.body?.start_at?.[0]
          || e2.body?.end_at?.[0]
          || 'Unable to publish slot.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (user?.profile_type !== 'interviewer') {
    return (
      <div className="booking-page">
        <h1 className="booking-title">Availability</h1>
        <p className="booking-error">Only interviewer accounts can publish availability slots.</p>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <h1 className="booking-title">Availability slots</h1>
      <p className="booking-subtitle">Publish your available interview windows for candidates to book.</p>

      <form className="booking-form-card" onSubmit={handleCreateSlot}>
        <h2 className="booking-section-title">Add availability slot</h2>
        <div className="booking-grid">
          <div>
            <label className="booking-label">Start date & time</label>
            <input
              type="datetime-local"
              className="booking-input"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="booking-label">End date & time</label>
            <input
              type="datetime-local"
              className="booking-input"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="booking-submit"
          disabled={saving || !startAt || !endAt}
        >
          {saving ? 'Publishing...' : 'Publish slot'}
        </button>
      </form>

      {message && <p className="booking-success">{message}</p>}
      {error && <p className="booking-error">{error}</p>}

      <div>
        <h2 className="booking-section-title">Upcoming slots</h2>
        {loading ? (
          <p className="booking-empty">Loading slots...</p>
        ) : slots.length === 0 ? (
          <p className="booking-empty">No availability slots yet.</p>
        ) : (
          <ul className="booking-list">
            {slots.map((slot) => (
              <li key={slot.id} className="booking-card">
                <div className="booking-card-header">
                  <span className="booking-card-title">
                    {new Date(slot.start_at).toLocaleString()} - {new Date(slot.end_at).toLocaleString()}
                  </span>
                  <span className="booking-status status-accepted">Available</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
