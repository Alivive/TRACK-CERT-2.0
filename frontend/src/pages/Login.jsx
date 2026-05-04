import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { User, Shield } from 'lucide-react';

const Login = () => {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState('intern');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Dynamic access codes from DB
  const [systemCodes, setSystemCodes] = useState({ admin_code: '', intern_code: '' });

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    accessCode: ''
  });

  useEffect(() => {
    const loadSystemData = async () => {
      try {
        // Load access codes
        const { data: settings } = await supabase
          .from('admin_settings')
          .select('admin_code, intern_code')
          .single();

        if (settings) {
          setSystemCodes(settings);
        }
      } catch (error) {
        console.error('[LOGIN] Failed to load system data:', error);
      }
    };

    loadSystemData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Verify Access Code
        const requiredCode = role === 'admin' ? systemCodes.admin_code : systemCodes.intern_code;
        
        // If codes are set in DB, enforce them. If not, fallback to default for first-time setup.
        const defaultAdmin = 'ADMIN2026';
        const defaultIntern = 'INTERNS2026';
        
        const effectiveCode = requiredCode || (role === 'admin' ? defaultAdmin : defaultIntern);

        if (formData.accessCode !== effectiveCode) {
          throw new Error(`Invalid ${role} access code.`);
        }

        const { data, error: signUpError } = await signUp(formData.email, formData.password, formData.fullName, role);
        if (signUpError) throw signUpError;
        
        if (!data.session) {
          alert('Account created! Please check your email to verify your account before logging in.');
          setIsSignUp(false);
        }
        // If session exists, AuthContext.js listener will automatically 
        // pick it up and App.jsx will redirect to dashboard. No alert needed.
      } else {
        const { error: signInError } = await signIn(formData.email, formData.password);
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="authScreen">
      <div className="auth-left">
        <div className="auth-logo-mark">CER<span>TRACK</span></div>
        <div className="auth-logo-sub">SYSTEM ACCESS</div>
        
        <div className="auth-welcome">{isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}</div>
        <div className="auth-desc">
          {isSignUp 
            ? 'Join the certification tracking platform. Choose your role to continue.' 
            : 'Access the intern certification tracking platform. Choose your role to continue.'}
        </div>
        
        {error && (
          <div className="auth-err" style={{ display: 'block' }}>
            {error}
          </div>
        )}

        <div className="role-selector">
          <div className={`role-btn ${role === 'admin' ? 'selected' : ''}`} onClick={() => setRole('admin')}>
            <div className="role-icon admin">
              <Shield size={18} color={role === 'admin' ? 'var(--red-light)' : 'var(--white)'} />
            </div>
            <div>
              <span className="role-label">Administrator</span>
              <span className="role-sub">Full platform access · Manage all data</span>
            </div>
          </div>
          <div className={`role-btn ${role === 'intern' ? 'selected' : ''}`} onClick={() => setRole('intern')}>
            <div className="role-icon intern">
              <User size={18} color={role === 'intern' ? '#5DADE2' : 'var(--white)'} />
            </div>
            <div>
              <span className="role-label">Intern</span>
              <span className="role-sub">View certifications · Submit new certs</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <>
              <label className="form-label-auth">FULL NAME</label>
              <input 
                type="text" 
                className="form-input-auth" 
                placeholder="John Doe" 
                required 
                autoComplete="name"
                value={formData.fullName} 
                onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
              />
            </>
          )}

          <label className="form-label-auth">EMAIL ADDRESS</label>
          <input 
            type="email" 
            className="form-input-auth" 
            placeholder="name@company.com" 
            required 
            autoComplete="email"
            value={formData.email} 
            onChange={(e) => setFormData({...formData, email: e.target.value})} 
          />
          
          <label className="form-label-auth">PASSWORD</label>
          <input 
            type="password" 
            className="form-input-auth" 
            placeholder="••••••••" 
            required 
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={formData.password} 
            onChange={(e) => setFormData({...formData, password: e.target.value})} 
          />

          {isSignUp && (
            <>
              <label className="form-label-auth">{role.toUpperCase()} ACCESS CODE</label>
              <input 
                type="text" 
                className="form-input-auth" 
                placeholder="Enter security code" 
                required 
                value={formData.accessCode} 
                onChange={(e) => setFormData({...formData, accessCode: e.target.value})} 
              />
            </>
          )}

          <button className="btn-signin" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'PROCESSING...' : (isSignUp ? 'CREATE ACCOUNT →' : 'SIGN IN →')}
          </button>
        </form>
        
        <div className="auth-hint">
          {isSignUp ? (
            <>Already have an account? <span style={{cursor: 'pointer', color: 'var(--red-light)'}} onClick={() => setIsSignUp(false)}>Sign in here</span></>
          ) : (
            <>Don't have an account? <span style={{cursor: 'pointer', color: 'var(--red-light)'}} onClick={() => setIsSignUp(true)}>Request access</span></>
          )}
        </div>
      </div>

      <div className="auth-right" style={{
        backgroundImage: 'url(/wallpaper.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="auth-tagline" style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '15px 30px',
          borderRadius: '8px',
          backdropFilter: 'blur(10px)'
        }}>
          TRACK · CERTIFY · GROW
        </div>
      </div>
    </div>
  );
};

export default Login;
