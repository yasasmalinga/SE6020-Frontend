import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  confirmCognitoSignUp,
  getCognitoAccessToken,
  signInWithCognito,
  signUpWithCognito,
} from '../auth/cognito';
import { apiRequest } from '../api/client';
import { buildCognitoUsername } from '../auth/username';
import { useAuth } from '../hooks/useAuth';

export default function SignUp() {
  const { signIn } = useAuth();
  const [profileType, setProfileType] = useState('candidate');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const navigate = useNavigate();
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const strengthScore = Number(hasMinLength) + Number(hasLetter) + Number(hasNumber);
  const strengthLabel = ['Weak', 'Weak', 'Medium', 'Strong'][strengthScore];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const cognitoUsername = buildCognitoUsername(email);

      if (needsConfirmation) {
        sessionStorage.setItem(
          'hiresphere_pending_profile',
          JSON.stringify({ username: cognitoUsername, profile_type: profileType })
        );
        await confirmCognitoSignUp(cognitoUsername, confirmationCode.trim());
        setSuccess('Account verified successfully. Please sign in.');
        navigate('/login', { replace: true });
        return;
      } else {
        const result = await signUpWithCognito({
          username: cognitoUsername,
          password,
          email,
          name,
          profileType,
        });

        if (result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
          sessionStorage.setItem(
            'hiresphere_pending_profile',
            JSON.stringify({ username: cognitoUsername, profile_type: profileType })
          );
          setNeedsConfirmation(true);
          setSuccess('Account created. Enter the verification code sent to your email.');
          return;
        }
      }

      await signInWithCognito(cognitoUsername, password);
      const token = await getCognitoAccessToken();
      if (!token) {
        throw new Error('Unable to get access token after sign-up.');
      }
      await signIn(token);
      await apiRequest('/api/users/profiles/me', {
        method: 'PUT',
        body: JSON.stringify({ profile_type: profileType }),
      });
      await signIn(token);
      sessionStorage.removeItem('hiresphere_pending_profile');
      setSuccess('Account created successfully. Redirecting...');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Unable to create account right now. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-hero">
          <div>
            <span className="auth-pill">Join HireSphere</span>
            <h1>
              Create your account and start interview practice today
            </h1>
            <p>
              Book mock interviews, submit coding solutions, and get feedback through one streamlined platform.
            </p>
          </div>
          <p>Your next offer starts with better preparation.</p>
        </section>

        <section className="auth-form-card">
          <h2>Create account</h2>
          <p className="auth-subtitle">Set up your profile in less than a minute.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Account type</label>
              <select
                value={profileType}
                onChange={(e) => setProfileType(e.target.value)}
                required
              >
                <option value="candidate">Candidate</option>
                <option value="interviewer">Interviewer</option>
              </select>
            </div>
            <div className="auth-field">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {needsConfirmation && (
              <div className="auth-field">
                <label>Verification code</label>
                <input
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="Enter code from your email"
                  required
                />
              </div>
            )}
            <div className="auth-field">
              <label>Password</label>
              <div className="auth-password-row">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
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
              <div className="auth-strength">
                <div className="auth-strength-track">
                  <span className={`auth-strength-fill auth-strength-${strengthScore}`} />
                </div>
                <p className="auth-strength-text">
                  Password strength: <strong>{strengthLabel}</strong> (use 8+ chars with letters and numbers)
                </p>
              </div>
            </div>
            <div className="auth-field">
              <label>Confirm password</label>
              <div className="auth-password-row">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {success && <p className="auth-success">{success}</p>}
            {error && <p className="auth-error">{error}</p>}

            <button
              type="submit"
              disabled={loading || (needsConfirmation && !confirmationCode.trim())}
              className="auth-submit"
            >
              {loading
                ? needsConfirmation ? 'Verifying...' : 'Creating account...'
                : needsConfirmation ? 'Verify and continue' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
