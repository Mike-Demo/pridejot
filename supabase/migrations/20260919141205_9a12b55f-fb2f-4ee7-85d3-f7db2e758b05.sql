REVOKE EXECUTE ON FUNCTION public.delete_expired_boards() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_expired_boards() TO service_role;