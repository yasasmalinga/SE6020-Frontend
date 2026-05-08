import { useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { setApiToken } from '../api/client';

export default function Layout() {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setApiToken(token);
  }, [token]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-nav-inner">
          <div className="app-nav-left">
            <Link to="/" className="app-brand">HireSphere</Link>
            <Link to="/" className="app-nav-link">Dashboard</Link>
            <Link to="/bookings" className="app-nav-link">Bookings</Link>
            <Link to="/book" className="app-nav-link">Book Interview</Link>
            <Link to="/availability" className="app-nav-link">Availability</Link>
            <Link to="/messages" className="app-nav-link">Messages</Link>
            <Link to="/live" className="app-nav-link">Live Session</Link>
            <Link to="/submissions" className="app-nav-link">Submissions</Link>
            <Link to="/interviews" className="app-nav-link">Interview History</Link>
          </div>
          <div className="app-nav-right">
            <span className="app-user-pill">{user?.name || user?.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="app-signout-btn"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

