import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirmPasswordReset, requestPasswordReset } from '../auth/cognito';
import { buildCognitoUsername } from '../auth/username';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resolvedUsername = String(identifier || '').trim().includes('@')
    ? buildCognitoUsername(identifier)
    : String(identifier || '').trim();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await requestPasswordReset(resolvedUsername);
      setStep('confirm');
      setSuccess('Reset code sent to your email. Enter code and new password.');
    } catch (err) {
      setError(err?.message || 'Unable to request password reset right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({
        username: resolvedUsername,
        confirmationCode: code.trim(),
        newPassword,
      });
      setSuccess('Password reset successful. Please sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err?.message || 'Unable to reset password with this code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-hero">
          <div>
            <span className="auth-pill">Account recovery</span>
            <h1>Reset your password and get back to your dashboard</h1>
            <p>Use your email or Cognito username to receive a reset code and set a new password.</p>
          </div>
          <p>Secure access, simple recovery.</p>
        </section>

        <section className="auth-form-card">
          <h2>Forgot password</h2>
          <p className="auth-subtitle">Request a code, then set a new password.</p>

          <form onSubmit={step === 'request' ? handleRequestCode : handleConfirmReset} className="auth-form">
            <div className="auth-field">
              <label>Email or username</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or cognito username"
                required
              />
            </div>

            {step === 'confirm' && (
              <>
                <div className="auth-field">
                  <label>Verification code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter code from your email"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label>New password</label>
                  <div className="auth-password-row">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter a new password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowNewPassword((current) => !current)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div className="auth-field">
                  <label>Confirm new password</label>
                  <div className="auth-password-row">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
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
              </>
            )}

            {success && <p className="auth-success">{success}</p>}
            {error && <p className="auth-error">{error}</p>}

            <button
              type="submit"
              disabled={loading || !resolvedUsername || (step === 'confirm' && (!code.trim() || !newPassword || !confirmPassword))}
              className="auth-submit"
            >
              {loading
                ? step === 'request' ? 'Sending code...' : 'Resetting password...'
                : step === 'request' ? 'Send reset code' : 'Confirm reset'}
            </button>
          </form>

          <p className="auth-switch">
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
