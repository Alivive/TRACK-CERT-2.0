import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabaseClient';

const NotificationsContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load notifications from database on mount
  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    
    const loadNotifications = async () => {
      try {
        let query;
        
        if (profile.role === 'admin') {
          // For admins: get notifications where user_id matches their id
          // If table doesn't support nullable intern_id, we'll handle this gracefully
          query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(50);
        } else if (profile.intern_id) {
          // For interns: get notifications for their intern_id
          query = supabase
            .from('notifications')
            .select('*')
            .eq('intern_id', profile.intern_id)
            .order('created_at', { ascending: false })
            .limit(50);
        } else {
          console.warn('[NOTIFICATIONS] No valid ID for loading notifications');
          setLoading(false);
          return;
        }

        const { data, error } = await query;
        if (error) {
          console.error('[NOTIFICATIONS] Database error:', error);
          // If table doesn't exist or has schema issues, use empty array
          setNotifications([]);
          setUnreadCount(0);
          setLoading(false);
          return;
        }

        if (data) {
          const formattedNotifications = data.map(n => ({
            id: n.id.toString(),
            type: n.type || 'unknown',
            title: n.title || 'No title',
            message: n.message || 'No message',
            read: n.read || false,
            timestamp: n.created_at,
            data: {}
          }));
          
          setNotifications(formattedNotifications);
          setUnreadCount(formattedNotifications.filter(n => !n.read).length);
        }
      } catch (e) {
        console.error('Failed to load notifications:', e);
        // Graceful fallback - use empty notifications
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [profile?.intern_id, profile?.id, profile?.role]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (!profile?.id || loading) return;
    localStorage.setItem(`notifications_${profile.id}`, JSON.stringify(notifications));
  }, [notifications, profile?.id, loading]);

  // Listen for new admin messages and intern messages
  useEffect(() => {
    if (!profile?.id) return;

    console.log('[NOTIFICATIONS] Setting up real-time subscription for user:', profile.id, 'role:', profile.role);

    try {
      let filter;
      if (profile.role === 'admin') {
        filter = `user_id=eq.${profile.id}`;
        console.log('[NOTIFICATIONS] Admin filter:', filter);
      } else if (profile.intern_id) {
        filter = `intern_id=eq.${profile.intern_id}`;
        console.log('[NOTIFICATIONS] Intern filter:', filter);
      } else {
        console.warn('[NOTIFICATIONS] No valid ID for notifications');
        return;
      }

      const channel = supabase
        .channel(`user-notifications-${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: filter
          },
          (payload) => {
            try {
              console.log('[NOTIFICATIONS] Real-time notification received:', payload);
              const newNotification = payload.new;
              
              // Add notification with database ID
              const notification = {
                id: newNotification.id.toString(),
                type: newNotification.type || 'unknown',
                title: newNotification.title || 'No title',
                message: newNotification.message || 'No message',
                read: false,
                data: {},
                timestamp: newNotification.created_at
              };
              
              console.log('[NOTIFICATIONS] Adding notification to state:', notification);
              setNotifications(prev => [notification, ...prev]);
              setUnreadCount(prev => prev + 1);
            } catch (err) {
              console.error('[NOTIFICATIONS] Error processing real-time notification:', err);
            }
          }
        )
        .subscribe((status) => {
          console.log('[NOTIFICATIONS] Subscription status:', status);
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('[NOTIFICATIONS] Subscription failed - notifications table may not exist');
          }
        });

      return () => {
        console.log('[NOTIFICATIONS] Cleaning up subscription');
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error('[NOTIFICATIONS] Error cleaning up subscription:', err);
        }
      };
    } catch (err) {
      console.error('[NOTIFICATIONS] Error setting up real-time subscription:', err);
    }
  }, [profile?.id, profile?.intern_id, profile?.role]);

  // Listen for new certifications (for interns to see their own certs)
  useEffect(() => {
    if (!profile?.intern_id || profile?.role === 'admin') return;

    const channel = supabase
      .channel('certification-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'certifications',
          filter: `intern_id=eq.${profile.intern_id}`
        },
        (payload) => {
          const newCert = payload.new;
          addNotification({
            type: 'certification',
            title: 'New Certification Added',
            message: `${newCert.name} has been added to your profile`,
            data: newCert,
            timestamp: new Date().toISOString()
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.intern_id, profile?.role]);

  // Listen for ALL certification changes (for admins)
  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const channel = supabase
      .channel('admin-certification-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'certifications'
        },
        async (payload) => {
          const newCert = payload.new;
          
          // Get intern name
          const { data: intern } = await supabase
            .from('interns')
            .select('first_name, last_name')
            .eq('id', newCert.intern_id)
            .single();
          
          const internName = intern ? `${intern.first_name} ${intern.last_name}` : 'An intern';
          
          addNotification({
            type: 'certification',
            title: 'New Certification Added',
            message: `${internName} added: ${newCert.name}`,
            data: newCert,
            timestamp: new Date().toISOString()
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'certifications'
        },
        async (payload) => {
          const updatedCert = payload.new;
          
          // Get intern name
          const { data: intern } = await supabase
            .from('interns')
            .select('first_name, last_name')
            .eq('id', updatedCert.intern_id)
            .single();
          
          const internName = intern ? `${intern.first_name} ${intern.last_name}` : 'An intern';
          
          addNotification({
            type: 'certification',
            title: 'Certification Updated',
            message: `${internName} updated: ${updatedCert.name}`,
            data: updatedCert,
            timestamp: new Date().toISOString()
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.role]);

  // Listen for new book assignments (for interns)
  useEffect(() => {
    if (!profile?.intern_id || profile?.role === 'admin') return;

    const channel = supabase
      .channel('book-assignments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'book_assignments',
          filter: `intern_id=eq.${profile.intern_id}`
        },
        async (payload) => {
          const assignment = payload.new;
          
          // Fetch book details
          const { data: book } = await supabase
            .from('books')
            .select('title, author')
            .eq('id', assignment.book_id)
            .single();

          if (book) {
            addNotification({
              type: 'book',
              title: 'New Book Assigned',
              message: `"${book.title}" by ${book.author} has been assigned to you`,
              data: { ...assignment, book },
              timestamp: new Date().toISOString()
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.intern_id, profile?.role]);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now().toString(),
      read: false,
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = async (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Update in database
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', parseInt(notificationId));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
      // Don't revert UI state - user experience is more important
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);

    // Update in database
    try {
      const notificationIds = notifications.filter(n => !n.read).map(n => parseInt(n.id));
      if (notificationIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', notificationIds);
      }
    } catch (e) {
      console.error('Failed to mark all notifications as read:', e);
      // Don't revert UI state
    }
  };

  const clearNotification = async (notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });

    // Delete from database
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', parseInt(notificationId));
    } catch (e) {
      console.error('Failed to delete notification:', e);
      // Don't revert UI state
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);

    // Delete from database
    try {
      if (profile?.role === 'admin') {
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', profile.id);
      } else if (profile?.intern_id) {
        await supabase
          .from('notifications')
          .delete()
          .eq('intern_id', profile.intern_id);
      }
    } catch (e) {
      console.error('Failed to clear all notifications:', e);
      // Don't revert UI state
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};
