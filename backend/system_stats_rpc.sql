-- RPC Function to get dynamic system stats for the login screen
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  intern_count INT;
  cert_count INT;
  track_count INT;
  total_hours INT;
BEGIN
  SELECT COUNT(*) INTO intern_count FROM public.interns;
  SELECT COUNT(*) INTO cert_count FROM public.certifications;
  SELECT COUNT(DISTINCT category) INTO track_count FROM public.certifications;
  SELECT COALESCE(SUM(hours), 0) INTO total_hours FROM public.certifications;
  
  RETURN json_build_object(
    'interns', intern_count,
    'certs', cert_count,
    'tracks', track_count,
    'hours', total_hours
  );
END;
$$;
