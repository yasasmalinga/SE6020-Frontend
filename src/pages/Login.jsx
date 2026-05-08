import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { getCognitoAccessToken, signInWithCognito } from '../auth/cognito';
import { buildCognitoUsername } from '../auth/username';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const trimmedId = String(identifier || '').trim();
      await signInWithCognito(trimmedId, password);
      const token = await getCognitoAccessToken();
      if (!token) {
        throw new Error('Unable to get access token after sign-in.');
      }
      await signIn(token);

      let pending = null;
      try {
        const raw = sessionStorage.getItem('hiresphere_pending_profile');
        pending = raw ? JSON.parse(raw) : null;
      } catch {
        pending = null;
      }
      const pendingUsername = pending && typeof pending.username === 'string' ? pending.username : '';
      const pendingRole =
        pending && (pending.profile_type === 'interviewer' || pending.profile_type === 'candidate')
          ? pending.profile_type
          : null;
      const idAsUsername = trimmedId.includes('@') ? buildCognitoUsername(trimmedId) : trimmedId;
      const matchesPending =
        pendingRole &&
        (pendingUsername === trimmedId || pendingUsername === idAsUsername);

      if (matchesPending) {
        try {
          await apiRequest('/api/users/profiles/me', {
            method: 'PUT',
            body: JSON.stringify({ profile_type: pendingRole }),
          });
        } catch {
          // Profile update is best-effort; auth still succeeds.
        }
        sessionStorage.removeItem('hiresphere_pending_profile');
        await signIn(token);
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-hero">
          <div>
            <span className="auth-pill">Welcome back</span>
            <h1>Continue your interview journey with HireSphere</h1>
            <p>
              Sign in to manage bookings, track submissions, and review interview progress from one dashboard.
            </p>
          </div>
          <p>Practice smarter. Interview better.</p>
        </section>

        <section className="auth-form-card">
          <h2>Sign in</h2>
          <p className="auth-subtitle">Enter your account details to continue.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Username</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter cognito username"
                required
              />
            </div>
            <div className="auth-field">
              <label>Password</label>
              <div className="auth-password-row">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            No account? <Link to="/signup">Create one</Link>
          </p>
          <p className="auth-switch">
            Forgot password? <Link to="/forgot-password">Reset it</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
