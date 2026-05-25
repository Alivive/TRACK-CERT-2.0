import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Lock, CheckCircle } from 'lucide-react';

const ResetPassword = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        const linkError = hashParams.get('error_description') || hashParams.get('error');
        const authCode = searchParams.get('code');

        if (linkError) {
          console.warn('[RESET_PASSWORD] Link error:', linkError);
          setError(
            linkError.includes('expired')
              ? 'This reset link has expired. Please request a fresh password reset link.'
              : linkError.replace(/\+/g, ' ')
          );
          return;
        }

        if (authCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);

          if (exchangeError) {
            console.error('[RESET_PASSWORD] Code exchange error:', exchangeError);
            setError('Failed to verify reset link. Please request a new password reset link.');
            return;
          }
        }

        // Check if we have a valid session from the reset link
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[RESET_PASSWORD] Session error:', sessionError);
          setError('Failed to verify reset link. Please try again or request a new reset link.');
          return;
        }

        if (!session) {
          console.warn('[RESET_PASSWORD] No active session from reset link');
          setError('Reset link has expired. Please request a new password reset link.');
          return;
        }

        console.log('[RESET_PASSWORD] Valid session found for user:', session.user.email);
        setSessionReady(true);
      } catch (err) {
        console.error('[RESET_PASSWORD] Initialization error:', err);
        setError('An error occurred. Please try again or request a new reset link.');
      }
    };

    handlePasswordReset();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate passwords
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      console.log('[RESET_PASSWORD] Updating password...');

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update password.');
      }

      console.log('[RESET_PASSWORD] Password updated successfully');
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          window.location.href = '/';
        }
      }, 3000);
    } catch (err) {
      console.error('[RESET_PASSWORD] Update error:', err.message);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="authScreen"
      style={{
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '40px 20px',
      }}
    >
      {/* Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.3), rgba(26, 26, 26, 0.4))',
          zIndex: 1,
        }}
      ></div>

      {/* Bokeh dots */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.9) 2px, transparent 2px),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.85) 3px, transparent 3px),
            radial-gradient(circle at 40% 70%, rgba(255, 255, 255, 0.8) 2px, transparent 2px),
            radial-gradient(circle at 90% 60%, rgba(255, 255, 255, 0.95) 2px, transparent 2px),
            radial-gradient(circle at 10% 80%, rgba(255, 255, 255, 0.9) 3px, transparent 3px),
            radial-gradient(circle at 60% 40%, rgba(255, 255, 255, 0.85) 2px, transparent 2px),
            radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.8) 2px, transparent 2px),
            radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.9) 3px, transparent 3px),
            radial-gradient(circle at 50% 15%, rgba(255, 255, 255, 0.85) 2px, transparent 2px),
            radial-gradient(circle at 85% 45%, rgba(255, 255, 255, 0.8) 2px, transparent 2px),
            radial-gradient(circle at 15% 60%, rgba(255, 255, 255, 0.95) 3px, transparent 3px),
            radial-gradient(circle at 45% 85%, rgba(255, 255, 255, 0.9) 2px, transparent 2px),
            radial-gradient(circle at 75% 25%, rgba(255, 255, 255, 0.85) 2px, transparent 2px),
            radial-gradient(circle at 25% 10%, rgba(255, 255, 255, 0.8) 3px, transparent 3px),
            radial-gradient(circle at 95% 75%, rgba(255, 255, 255, 0.9) 2px, transparent 2px),
            radial-gradient(circle at 5% 40%, rgba(255, 255, 255, 0.85) 2px, transparent 2px),
            radial-gradient(circle at 55% 65%, rgba(255, 255, 255, 0.8) 3px, transparent 3px),
            radial-gradient(circle at 35% 90%, rgba(255, 255, 255, 0.95) 2px, transparent 2px),
            radial-gradient(circle at 65% 55%, rgba(255, 255, 255, 0.9) 2px, transparent 2px),
            radial-gradient(circle at 88% 88%, rgba(255, 255, 255, 0.85) 3px, transparent 3px)
          `,
          backgroundSize: '100% 100%',
          zIndex: 1,
          opacity: 1,
        }}
      ></div>

      {/* Centered Form */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(18, 18, 18, 0.95)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '50px 40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="auth-logo-mark" style={{ textAlign: 'center', marginBottom: '10px' }}>
          CER<span>TRACK</span>
        </div>
        <div className="auth-logo-sub" style={{ textAlign: 'center', marginBottom: '30px' }}>
          SYSTEM ACCESS
        </div>

        {!success ? (
          <>
            <div className="auth-welcome" style={{ textAlign: 'center', marginBottom: '10px' }}>
              SET NEW PASSWORD
            </div>
            <div className="auth-desc" style={{ textAlign: 'center', marginBottom: '30px' }}>
              Enter your new password below. Make sure it's secure and at least 6 characters long.
            </div>

            {error && (
              <div className="auth-err" style={{ display: 'block', marginBottom: '20px' }}>
                {error}
              </div>
            )}

            {!sessionReady && !error && (
              <div
                style={{
                  background: 'rgba(93, 173, 226, 0.2)',
                  border: '1px solid #5DADE2',
                  color: '#5DADE2',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                Verifying reset link...
              </div>
            )}

            {sessionReady && (
              <form onSubmit={handleSubmit}>
                <label className="form-label-auth">NEW PASSWORD</label>
                <div
                  style={{
                    position: 'relative',
                    marginBottom: '20px',
                  }}
                >
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="password"
                    className="form-input-auth"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    style={{
                      paddingLeft: '42px',
                    }}
                  />
                </div>

                <label className="form-label-auth">CONFIRM PASSWORD</label>
                <div
                  style={{
                    position: 'relative',
                    marginBottom: '20px',
                  }}
                >
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="password"
                    className="form-input-auth"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    style={{
                      paddingLeft: '42px',
                    }}
                  />
                </div>

                <button
                  className="btn-signin"
                  disabled={loading}
                  style={{
                    marginTop: '10px',
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'UPDATING PASSWORD...' : 'RESET PASSWORD →'}
                </button>
              </form>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              <CheckCircle size={48} color="#5DADE2" />
            </div>
            <div className="auth-welcome" style={{ marginBottom: '10px' }}>
              PASSWORD RESET SUCCESSFUL
            </div>
            <div className="auth-desc" style={{ marginBottom: '30px' }}>
              Your password has been successfully updated. You will be redirected to the login page shortly.
            </div>
            <button
              onClick={() => {
                if (onComplete) {
                  onComplete();
                } else {
                  window.location.href = '/';
                }
              }}
              className="btn-signin"
              style={{
                marginTop: '0',
              }}
            >
              GO TO LOGIN →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
