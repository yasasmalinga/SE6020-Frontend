import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function Bookings() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState('');

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/bookings');
      setBookings(data.data ?? []);
    } catch (e) {
      setError(e.body?.message || e.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadBookings();
    }
    if (!authLoading && !user) {
      setLoading(false);
      setError('Please sign in again to continue.');
    }
  }, [authLoading, user]);

  const updateStatus = async (bookingId, status) => {
    setUpdatingId(bookingId);
    setError('');
    setMessage('');
    try {
      const updated = await apiRequest(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setBookings((current) => current.map((booking) => (booking.id === bookingId ? updated : booking)));
      setMessage(`Booking ${status}.`);
    } catch (e) {
      setError(e.body?.message || `Unable to mark booking as ${status}.`);
    } finally {
      setUpdatingId(null);
    }
  };

  const isBookingInterviewer = (booking) => Number(booking?.interviewer?.user?.id) === Number(user?.id);
  const isBookingCandidate = (booking) => Number(booking?.candidate?.user?.id) === Number(user?.id);

  const canInterviewerRespond = (booking) => isBookingInterviewer(booking) && booking.status === 'pending';
  const canInterviewerComplete = (booking) => isBookingInterviewer(booking) && booking.status === 'accepted';
  const canCandidateCancel = (booking) => isBookingCandidate(booking) && booking.status === 'pending';

  if (authLoading || loading) return <p>Loading bookings...</p>;

  return (
    <div className="booking-page">
      <h1 className="booking-title">My bookings</h1>
      {message && <p className="booking-success">{message}</p>}
      {error && <p className="booking-error">{error}</p>}
      {bookings.length === 0 ? (
        <p className="booking-empty">
          {user?.profile_type === 'interviewer' ? (
            <>
              No bookings yet. When a candidate requests you, or if you book as a candidate, those sessions appear
              here.
            </>
          ) : (
            <>
              No bookings yet. <Link to="/book">Book an interview</Link>.
            </>
          )}
        </p>
      ) : (
        <ul className="booking-list">
          {bookings.map((b) => (
            <li key={b.id} className="booking-card">
              <div className="booking-card-header">
                <span className="booking-card-title">
                  {isBookingInterviewer(b)
                    ? (b.candidate?.user?.name ?? 'Candidate')
                    : (b.interviewer?.user?.name ?? 'Interviewer')}{' '}
                  – {new Date(b.scheduled_at).toLocaleString()}
                </span>
                <span className={`booking-status status-${b.status}`}>
                  {b.status}
                </span>
              </div>
              {b.amount != null && <p className="booking-card-meta">Amount: ${b.amount}</p>}

              <div className="booking-actions">
                {b.status === 'accepted' && (
                  <Link
                    to={`/live?bookingId=${b.id}`}
                    className="booking-action-btn"
                  >
                    Open live session
                  </Link>
                )}

                {canInterviewerRespond(b) && (
                  <>
                    <button
                      type="button"
                      className="booking-action-btn approve"
                      disabled={updatingId === b.id}
                      onClick={() => updateStatus(b.id, 'accepted')}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="booking-action-btn reject"
                      disabled={updatingId === b.id}
                      onClick={() => updateStatus(b.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </>
                )}

                {canInterviewerComplete(b) && (
                  <button
                    type="button"
                    className="booking-action-btn"
                    disabled={updatingId === b.id}
                    onClick={() => updateStatus(b.id, 'completed')}
                  >
                    Mark completed
                  </button>
                )}

                {canCandidateCancel(b) && (
                  <button
                    type="button"
                    className="booking-action-btn reject"
                    disabled={updatingId === b.id}
                    onClick={() => updateStatus(b.id, 'cancelled')}
                  >
                    Cancel request
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
