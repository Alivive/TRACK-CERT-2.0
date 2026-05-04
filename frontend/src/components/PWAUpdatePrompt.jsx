import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

const PWAUpdatePrompt = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Check if service worker is supported
    if ('serviceWorker' in navigator) {
      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page when new service worker takes control
        window.location.reload();
      });

      // Check for waiting service worker
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdatePrompt(true);
        }

        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdatePrompt(true);
            }
          });
        });
      });

      // Check for updates every 60 seconds
      setInterval(() => {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update();
        });
      }, 60000);
    }
  }, []);

  // Auto-update countdown
  useEffect(() => {
    if (showUpdatePrompt && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showUpdatePrompt && countdown === 0) {
      handleUpdate();
    }
  }, [showUpdatePrompt, countdown]);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdatePrompt(false);
    }
  };

  const handleUpdateNow = () => {
    setCountdown(0);
    handleUpdate();
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    setCountdown(10); // Reset countdown
  };

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
      color: 'white',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(46, 204, 113, 0.3)',
      zIndex: 1001,
      maxWidth: '400px',
      margin: '0 auto',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <style>
        {`
          @keyframes slideDown {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.2)', 
          padding: '8px', 
          borderRadius: '8px',
          flexShrink: 0
        }}>
          <RefreshCw size={20} />
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '4px',
            letterSpacing: '0.5px'
          }}>
            Update Available
          </div>
          
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.9, 
            lineHeight: '1.4',
            marginBottom: '12px'
          }}>
            A new version of CerTrack is available. Auto-updating in {countdown} seconds...
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleUpdateNow}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.2)';
              }}
            >
              <RefreshCw size={12} />
              Update Now
            </button>
            
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              Later
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            opacity: 0.7,
            flexShrink: 0,
            transition: 'opacity 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.opacity = '1';
          }}
          onMouseOut={(e) => {
            e.target.style.opacity = '0.7';
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;