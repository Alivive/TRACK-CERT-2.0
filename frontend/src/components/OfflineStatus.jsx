import { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, Cloud, Sync, CheckCircle } from 'lucide-react';
import { offlineManager } from '../utils/offlineManager';

const OfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Listen for online/offline changes
    const unsubscribe = offlineManager.addListener((event, online) => {
      setIsOnline(online);
      
      if (event === 'sync-complete') {
        setSyncInProgress(false);
        setShowSyncSuccess(true);
        setPendingCount(0);
        setTimeout(() => setShowSyncSuccess(false), 3000);
      }
    });

    // Check sync status periodically
    const checkStatus = () => {
      const status = offlineManager.getSyncStatus();
      setSyncInProgress(status.syncInProgress);
    };

    const interval = setInterval(checkStatus, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Don't show anything if online and no sync activity
  if (isOnline && !syncInProgress && !showSyncSuccess && pendingCount === 0) {
    return null;
  }

  const getStatusInfo = () => {
    if (showSyncSuccess) {
      return {
        icon: <CheckCircle size={16} />,
        text: 'All data synced',
        color: '#27ae60',
        bg: 'rgba(39, 174, 96, 0.1)'
      };
    }
    
    if (syncInProgress) {
      return {
        icon: <Sync size={16} className="animate-spin" />,
        text: 'Syncing data...',
        color: '#3498db',
        bg: 'rgba(52, 152, 219, 0.1)'
      };
    }
    
    if (!isOnline) {
      return {
        icon: <WifiOff size={16} />,
        text: 'Offline mode - data will sync when online',
        color: '#e67e22',
        bg: 'rgba(230, 126, 34, 0.1)'
      };
    }

    return {
      icon: <Cloud size={16} />,
      text: 'Online',
      color: '#27ae60',
      bg: 'rgba(39, 174, 96, 0.1)'
    };
  };

  const status = getStatusInfo();

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: status.bg,
        border: `1px solid ${status.color}30`,
        color: status.color,
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      
      {status.icon}
      <span>{status.text}</span>
      
      {pendingCount > 0 && (
        <span
          style={{
            background: status.color,
            color: 'white',
            borderRadius: '10px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: '600'
          }}
        >
          {pendingCount}
        </span>
      )}
    </div>
  );
};

export default OfflineStatus;