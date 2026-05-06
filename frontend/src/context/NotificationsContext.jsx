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
    if (!profile?.intern_id) return;
    
    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('intern_id', profile.intern_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        if (data) {
          const formattedNotifications = data.map(n => ({
            id: n.id.toString(),
            type: n.type,
            title: n.title,
            message: n.message,
            read: n.read,
            timestamp: n.created_at,
            data: {}
          }));
          
          setNotifications(formattedNotifications);
          setUnreadCount(formattedNotifications.filter(n => !n.read).length);
        }
      } catch (e) {
        console.error('Failed to load notifications:', e);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [profile?.intern_id]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (!profile?.id || loading) return;
    localStorage.setItem(`notifications_${profile.id}`, JSON.stringify(notifications));
  }, [notifications, profile?.id, loading]);

  // Listen for new admin messages
  useEffect(() => {
    if (!profile?.intern_id) return;

    const channel = supabase
      .channel('admin-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `intern_id=eq.${profile.intern_id}`
        },
        (payload) => {
          const newNotification = payload.new;
          addNotification({
            type: newNotification.type,
            title: newNotification.title,
            message: newNotification.message,
            data: {},
            timestamp: newNotification.created_at
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.intern_id]);

  // Listen for new certifications
  useEffect(() => {
    if (!profile?.intern_id) return;

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
  }, [profile?.intern_id]);

  // Listen for new book assignments
  useEffect(() => {
    if (!profile?.intern_id) return;

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
  }, [profile?.intern_id]);

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
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);

    // Delete from database
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('intern_id', profile?.intern_id);
    } catch (e) {
      console.error('Failed to clear all notifications:', e);
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
