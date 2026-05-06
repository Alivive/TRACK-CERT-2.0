import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../utils/useDatabase';
import { Send, Users, User, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const SendMessage = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { interns } = useDatabase();
  
  const [messageData, setMessageData] = useState({
    recipient: 'all', // 'all' or specific intern_id
    title: '',
    message: ''
  });
  
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
        <h2>Admin Access Required</h2>
        <p style={{ color: 'var(--gray)' }}>Only administrators can send messages.</p>
      </div>
    );
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageData.title.trim() || !messageData.message.trim()) {
      setError('Please fill in both title and message');
      return;
    }

    setSending(true);
    setError('');
    setSuccess(false);

    try {
      const timestamp = new Date().toISOString();
      
      // Determine recipients
      const recipients = messageData.recipient === 'all' 
        ? interns.map(i => i.id)
        : [messageData.recipient];

      // Store count before resetting form
      const sentCount = recipients.length;

      // Create notification for each recipient
      const notifications = recipients.map(internId => ({
        intern_id: internId, // For interns, use intern_id
        type: 'admin_message',
        title: messageData.title,
        message: messageData.message,
        read: false,
        created_at: timestamp
      }));

      // Insert notifications into database
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      // Show success with actual sent count
      setSuccess(sentCount);
      setMessageData({
        recipient: 'all',
        title: '',
        message: ''
      });

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const recipientCount = messageData.recipient === 'all' ? interns.length : 1;

  return (
    <div id="page-send-message" className="page active">
      <div className="section-header">
        <span className="section-title">SEND MESSAGE TO INTERNS</span>
      </div>

      {/* Message Form */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">COMPOSE MESSAGE</span>
        </div>
        <div className="card-body">
          <form onSubmit={handleSendMessage}>
            <div className="form-group">
              <label className="form-label">RECIPIENT</label>
              <select
                className="form-input"
                value={messageData.recipient}
                onChange={(e) => setMessageData({ ...messageData, recipient: e.target.value })}
                required
              >
                <option value="all">All Interns ({interns.length})</option>
                <optgroup label="Individual Interns">
                  {interns.map(intern => (
                    <option key={intern.id} value={intern.id}>
                      {intern.first_name} {intern.last_name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">MESSAGE TITLE</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Important Update, Reminder, Announcement"
                value={messageData.title}
                onChange={(e) => setMessageData({ ...messageData, title: e.target.value })}
                required
                maxLength={100}
              />
              <div style={{ fontSize: '10px', color: 'var(--gray2)', marginTop: '4px' }}>
                {messageData.title.length}/100 characters
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">MESSAGE</label>
              <textarea
                className="form-input"
                rows="6"
                placeholder="Type your message here..."
                value={messageData.message}
                onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                required
                maxLength={500}
                style={{ resize: 'vertical', minHeight: '120px' }}
              />
              <div style={{ fontSize: '10px', color: 'var(--gray2)', marginTop: '4px' }}>
                {messageData.message.length}/500 characters
              </div>
            </div>

            {error && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: 'var(--red-light)', 
                padding: '12px', 
                borderRadius: '6px', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px'
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div style={{ 
                background: 'rgba(39, 174, 96, 0.1)', 
                color: 'var(--green)', 
                padding: '12px', 
                borderRadius: '6px', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px'
              }}>
                <CheckCircle size={16} />
                Message sent successfully to {success} intern{success !== 1 ? 's' : ''}!
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Send size={16} />
              {sending ? 'SENDING...' : `SEND TO ${recipientCount} INTERN${recipientCount !== 1 ? 'S' : ''}`}
            </button>
          </form>
        </div>
      </div>

      {/* Preview Card */}
      {(messageData.title || messageData.message) && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <span className="card-title">MESSAGE PREVIEW</span>
            <span style={{ fontSize: '11px', color: 'var(--gray2)' }}>
              How interns will see this notification
            </span>
          </div>
          <div className="card-body">
            <div style={{ 
              background: 'var(--black3)', 
              padding: '16px', 
              borderRadius: '8px',
              border: '1px solid var(--border2)',
              maxWidth: '400px'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                <div style={{
                  fontSize: '24px',
                  flexShrink: 0,
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--black4)',
                  borderRadius: '8px'
                }}>
                  📢
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: 'var(--white)', 
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {messageData.title || 'Message Title'}
                    <span style={{
                      width: '8px',
                      height: '8px',
                      background: 'var(--red-light)',
                      borderRadius: '50%',
                      flexShrink: 0
                    }} />
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--gray)', 
                    marginBottom: '6px',
                    lineHeight: '1.4'
                  }}>
                    {messageData.message || 'Your message will appear here...'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--gray2)' }}>
                    Just now
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendMessage;
