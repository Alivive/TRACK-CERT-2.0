import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Mail, ArrowLeft } from 'lucide-react';

const getPasswordResetRedirectUrl = () => {
  const configuredUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_SITE_URL;
  const origin = configuredUrl || window.location.origin;
  return `${origin.replace(/\/$/, '')}/reset-password`;
};

const ForgotPassword = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setMessage('');

    try {
      if (!email.trim()) {
        throw new Error('Please enter your email address.');
      }

      console.log('[FORGOT_PASSWORD] Sending password reset email for:', email);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: getPasswordResetRedirectUrl(),
        }
      );

      if (resetError) {
        // Supabase returns success even if email doesn't exist (security best practice)
        // But we'll handle any actual errors
        if (resetError.message) {
          throw new Error(resetError.message);
        }
      }

      // Show success message regardless (security best practice - don't reveal if email exists)
      setSuccess(true);
      setMessage(
        'If an account exists with this email address, you will receive a password reset link shortly. Please check your email (including spam folder) within a few minutes.'
      );
      setEmail('');

      // Optionally redirect back after 5 seconds
      setTimeout(() => {
        onBack();
      }, 5000);
    } catch (err) {
      console.error('[FORGOT_PASSWORD] Error:', err.message);
      setError(err.message || 'Failed to send reset email. Please try again.');
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
        {/* Back Button */}
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--white)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
            e.target.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.transform = 'translateX(0)';
          }}
        >
          <ArrowLeft size={18} />
          <span style={{ fontSize: '14px' }}>Back</span>
        </button>

        <div className="auth-logo-mark" style={{ textAlign: 'center', marginBottom: '10px' }}>
          CER<span>TRACK</span>
        </div>
        <div className="auth-logo-sub" style={{ textAlign: 'center', marginBottom: '30px' }}>
          SYSTEM ACCESS
        </div>

        <div className="auth-welcome" style={{ textAlign: 'center', marginBottom: '10px' }}>
          RESET PASSWORD
        </div>
        <div className="auth-desc" style={{ textAlign: 'center', marginBottom: '30px' }}>
          Enter your email address and we'll send you a link to reset your password.
        </div>

        {error && (
          <div className="auth-err" style={{ display: 'block', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: 'rgba(93, 173, 226, 0.2)',
              border: '1px solid #5DADE2',
              color: '#5DADE2',
              padding: '12px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              marginBottom: '20px',
              lineHeight: '1.5',
            }}
          >
            <strong>Check your email!</strong>
            <div style={{ marginTop: '8px' }}>{message}</div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <label className="form-label-auth">EMAIL ADDRESS</label>
            <div
              style={{
                position: 'relative',
                marginBottom: '20px',
              }}
            >
              <Mail
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
                type="email"
                className="form-input-auth"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? 'SENDING RESET LINK...' : 'SEND RESET LINK →'}
            </button>
          </form>
        )}

        {success && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={onBack}
              className="btn-signin"
              style={{
                marginTop: '0',
              }}
            >
              BACK TO LOGIN →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
