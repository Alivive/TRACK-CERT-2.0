import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Info, AlertCircle, MessageSquare } from 'lucide-react';

const Toast = ({ toast, removeToast }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start exit animation slightly before the toast is actually removed
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, toast.duration ? toast.duration - 300 : 4700);

    return () => clearTimeout(exitTimer);
  }, [toast]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300); // Wait for exit animation
  };

  const getIcon = () => {
    switch(toast.type) {
      case 'success': return <CheckCircle size={20} color="#2ECC71" />;
      case 'error': return <AlertCircle size={20} color="#E74C3C" />;
      case 'admin_message': return <MessageSquare size={20} color="#3498DB" />;
      case 'certification': return <span style={{fontSize: '18px', display: 'flex', alignItems: 'center'}}>🎓</span>;
      case 'book': return <span style={{fontSize: '18px', display: 'flex', alignItems: 'center'}}>📚</span>;
      default: return <Info size={20} color="#3498DB" />;
    }
  };

  return (
    <div className={isExiting ? 'toast-exit' : 'toast-enter'} style={{
      background: 'var(--black2)',
      border: '1px solid var(--border2)',
      borderLeft: `4px solid ${
        toast.type === 'success' ? '#2ECC71' : 
        toast.type === 'error' ? '#E74C3C' : 
        toast.type === 'certification' ? '#9B59B6' : 
        '#3498DB'
      }`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      borderRadius: '8px',
      padding: '16px',
      minWidth: '300px',
      maxWidth: '400px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      pointerEvents: 'auto',
      marginBottom: '10px'
    }}>
      <div style={{ marginTop: '2px', display: 'flex', flexShrink: 0 }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)', marginBottom: '4px' }}>{toast.title}</div>}
        <div style={{ fontSize: '13px', color: 'var(--gray)', lineHeight: '1.4' }}>{toast.message}</div>
      </div>
      <button 
        onClick={handleClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--gray)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '4px',
          borderRadius: '4px',
          transition: 'background 0.2s, color 0.2s',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--black4)';
          e.currentTarget.style.color = 'var(--white)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--gray)';
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'none' // Let clicks pass through empty space
    }}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
