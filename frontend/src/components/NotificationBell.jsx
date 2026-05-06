import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Reply } from 'lucide-react';
import { useNotifications } from '../context/NotificationsContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'certification':
        return '🎓';
      case 'book':
        return '📚';
      case 'admin_message':
        return '📢';
      default:
        return '🔔';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !replyModal) return;

    setSending(true);
    try {
      // Get all admin users
      const { data: admins, error: adminsError } = await supabase
        .from('users')
        .select('id, intern_id')
        .eq('role', 'admin');

      if (adminsError) throw adminsError;

      // Create notifications for all admins using user_id
      const notifications = admins.map(admin => ({
        user_id: admin.id, // Use user_id for admins
        type: 'admin_message',
        title: `Reply from ${profile?.full_name || 'Intern'}`,
        message: `Re: "${replyModal.title}" - ${replyText}`,
        read: false,
        created_at: new Date().toISOString()
      }));

      if (notifications.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (insertError) throw insertError;
      }

      // Close modal and reset
      setReplyModal(null);
      setReplyText('');
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to send reply:', err);
      alert('Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--black4)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <Bell size={20} color="#f39c12" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'var(--red-light)',
              color: 'var(--white)',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: '700',
              minWidth: '18px',
              textAlign: 'center',
              lineHeight: '1'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxHeight: '500px',
            background: 'var(--black2)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--black3)'
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)' }}>
                Notifications
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gray2)', marginTop: '2px' }}>
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </div>
            </div>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--blue)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--black4)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              maxHeight: '400px'
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--gray2)'
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔔</div>
                <div style={{ fontSize: '13px' }}>No notifications yet</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                  You'll see updates here when certifications are added or books are assigned
                </div>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border2)',
                    cursor: 'pointer',
                    background: notification.read ? 'transparent' : 'rgba(239, 68, 68, 0.05)',
                    transition: 'background 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (notification.read) {
                      e.currentTarget.style.background = 'var(--black3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (notification.read) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    {/* Icon */}
                    <div
                      style={{
                        fontSize: '24px',
                        flexShrink: 0,
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--black4)',
                        borderRadius: '8px'
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: 'var(--white)',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        {notification.title}
                        {!notification.read && (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              background: 'var(--red-light)',
                              borderRadius: '50%',
                              flexShrink: 0
                            }}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--gray)',
                          marginBottom: '6px',
                          lineHeight: '1.4'
                        }}
                      >
                        {notification.message}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--gray2)' }}>
                        {formatTimestamp(notification.timestamp)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0, flexDirection: 'column' }}>
                      {notification.type === 'admin_message' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyModal(notification);
                            setIsOpen(false);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--blue)',
                            transition: 'background 0.2s'
                          }}
                          title="Reply"
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--black4)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Reply size={14} />
                        </button>
                      )}
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--green)',
                            transition: 'background 0.2s'
                          }}
                          title="Mark as read"
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--black4)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--gray)',
                          transition: 'background 0.2s'
                        }}
                        title="Remove"
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--black4)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => {
            setReplyModal(null);
            setReplyText('');
          }}
        >
          <div
            style={{
              background: 'var(--black2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid var(--border2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)' }}>
                  Reply to Admin
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray2)', marginTop: '4px' }}>
                  Re: {replyModal.title}
                </div>
              </div>
              <button
                onClick={() => {
                  setReplyModal(null);
                  setReplyText('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--gray)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              <div
                style={{
                  background: 'var(--black3)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: 'var(--gray)',
                  lineHeight: '1.5'
                }}
              >
                <div style={{ fontWeight: '600', color: 'var(--white)', marginBottom: '4px' }}>
                  Original Message:
                </div>
                {replyModal.message}
              </div>

              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  background: 'var(--black3)',
                  border: '1px solid var(--border2)',
                  borderRadius: '8px',
                  color: 'var(--white)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none'
                }}
                maxLength={500}
                autoFocus
              />
              <div style={{ fontSize: '10px', color: 'var(--gray2)', marginTop: '4px', textAlign: 'right' }}>
                {replyText.length}/500 characters
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--border2)',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}
            >
              <button
                onClick={() => {
                  setReplyModal(null);
                  setReplyText('');
                }}
                style={{
                  padding: '8px 16px',
                  background: 'var(--black3)',
                  border: '1px solid var(--border2)',
                  borderRadius: '6px',
                  color: 'var(--white)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || sending}
                style={{
                  padding: '8px 16px',
                  background: replyText.trim() && !sending ? 'var(--blue)' : 'var(--black4)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'var(--white)',
                  fontSize: '13px',
                  cursor: replyText.trim() && !sending ? 'pointer' : 'not-allowed',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Reply size={14} />
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
