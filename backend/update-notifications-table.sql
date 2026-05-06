-- Add user_id column to notifications table for admin notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Drop the old constraint that required intern_id
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_intern_id_check;

-- Add new constraint that requires either intern_id OR user_id
ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_check 
CHECK (intern_id IS NOT NULL OR user_id IS NOT NULL);

-- Update RLS policies to handle both intern and admin notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Policy: Users can only see their own notifications (both intern and admin)
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (
    (intern_id IS NOT NULL AND intern_id = (
      SELECT intern_id FROM users WHERE id = auth.uid()
    )) OR
    (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (
    (intern_id IS NOT NULL AND intern_id = (
      SELECT intern_id FROM users WHERE id = auth.uid()
    )) OR
    (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (
    (intern_id IS NOT NULL AND intern_id = (
      SELECT intern_id FROM users WHERE id = auth.uid()
    )) OR
    (user_id IS NOT NULL AND user_id = auth.uid())
  );

COMMENT ON COLUMN notifications.user_id IS 'For admin notifications - references users.id directly';
COMMENT ON COLUMN notifications.intern_id IS 'For intern notifications - references interns.id';