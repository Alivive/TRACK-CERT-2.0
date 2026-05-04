import { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';

const CacheUpdateNotification = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if cache was just cleared
    const cacheCleared = sessionStorage.getItem('cache_just_cleared');
    
    if (cacheCleared === 'true') {
      setShow(true);
      sessionStorage.removeItem('cache_just_cleared');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setShow(false);
      }, 5000);
    }
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'var(--black2)',
      border: '1px solid var(--red)',
      borderRadius: '6px',
      padding: '16px 20px',
      maxWidth: '400px',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      animation: 'slideIn 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <RefreshCw size={20} color="var(--red-light)" />
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: '14px', 
            color: 'var(--white)',
            marginBottom: '4px'
          }}>
            App Updated
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: 'var(--gray)',
            lineHeight: '1.5'
          }}>
            Your cache has been cleared to ensure you have the latest security updates.
          </div>
        </div>
        <button
          onClick={() => setShow(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--gray)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default CacheUpdateNotification;
