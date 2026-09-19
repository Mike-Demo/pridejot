DROP POLICY "Anyone can start a board" ON public.boards;

CREATE POLICY "Anyone can start a board"
ON public.boards
FOR INSERT
TO anon, authenticated
WITH CHECK (
  code ~ '^[A-Z2-9]{6}$'
  AND expires_at > now()
  AND expires_at <= now() + interval '25 hours'
);