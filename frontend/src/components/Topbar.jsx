import { Plus, Menu, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const Topbar = ({ title, onPageChange, toggleSidebar }) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageText.trim()) return;

    setSending(true);
    try {
      // Get all admin users
      const { data: admins, error: adminsError } = await supabase
        .from('users')
        .select('intern_id')
        .eq('role', 'admin');

      if (adminsError) throw adminsError;

      // Create notifications for all admins
      const notifications = admins
        .filter(admin => admin.intern_id)
        .map(admin => ({
          intern_id: admin.intern_id,
          type: 'admin_message',
          title: `Message from ${profile?.full_name || 'Intern'}`,
          message: `${messageTitle}: ${messageText}`,
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
      setShowMessageModal(false);
      setMessageTitle('');
      setMessageText('');
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="menu-toggle" onClick={toggleSidebar}>
            <Menu size={20} />
          </div>
          <div className="page-title">{title}</div>
        </div>
        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationBell />
          
          {/* Message Admin Button (for interns) */}
          {!isAdmin && (
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowMessageModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: 'var(--blue)',
                border: 'none',
                borderRadius: '6px',
                color: 'var(--white)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={14} /> <span className="btn-text">MESSAGE ADMIN</span>
            </button>
          )}
          
          {isAdmin && (
            <button 
              className="btn btn-primary" 
              id="topAddBtn" 
              onClick={() => onPageChange('add_cert')}
            >
              <Plus size={14} /> <span className="btn-text">ADD CERT</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Admin Modal */}
      {showMessageModal && (
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
            setShowMessageModal(false);
            setMessageTitle('');
            setMessageText('');
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
                  Message Admin
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray2)', marginTop: '4px' }}>
                  Send a message to all administrators
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--white)', marginBottom: '8px', display: 'block' }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder="e.g., Question about certification, Request for help..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--black3)',
                    border: '1px solid var(--border2)',
                    borderRadius: '8px',
                    color: 'var(--white)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                  maxLength={100}
                  autoFocus
                />
                <div style={{ fontSize: '10px', color: 'var(--gray2)', marginTop: '4px', textAlign: 'right' }}>
                  {messageTitle.length}/100 characters
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--white)', marginBottom: '8px', display: 'block' }}>
                  Message
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message here..."
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
                />
                <div style={{ fontSize: '10px', color: 'var(--gray2)', marginTop: '4px', textAlign: 'right' }}>
                  {messageText.length}/500 characters
                </div>
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
                  setShowMessageModal(false);
                  setMessageTitle('');
                  setMessageText('');
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
                onClick={handleSendMessage}
                disabled={!messageTitle.trim() || !messageText.trim() || sending}
                style={{
                  padding: '8px 16px',
                  background: messageTitle.trim() && messageText.trim() && !sending ? 'var(--blue)' : 'var(--black4)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'var(--white)',
                  fontSize: '13px',
                  cursor: messageTitle.trim() && messageText.trim() && !sending ? 'pointer' : 'not-allowed',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <MessageSquare size={14} />
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Topbar;