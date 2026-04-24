-- CerTrack Database Triggers
-- Automates user profile creation on signup

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_intern_id UUID;
BEGIN
  -- 1. Insert into profiles
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'intern')
  );

  -- 2. Link or create intern record
  SELECT id INTO existing_intern_id FROM public.interns WHERE email = new.email;
  
  IF existing_intern_id IS NOT NULL THEN
    UPDATE public.interns SET auth_id = new.id WHERE id = existing_intern_id;
  ELSE
    INSERT INTO public.interns (id, auth_id, first_name, last_name, email)
    VALUES (
      uuid_generate_v4(), 
      new.id, 
      SPLIT_PART(new.raw_user_meta_data->>'full_name', ' ', 1),
      SUBSTRING(new.raw_user_meta_data->>'full_name' FROM POSITION(' ' IN new.raw_user_meta_data->>'full_name') + 1),
      new.email
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
