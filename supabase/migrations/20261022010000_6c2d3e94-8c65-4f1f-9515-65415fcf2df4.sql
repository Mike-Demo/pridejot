REVOKE SELECT ON public.boards FROM anon;

CREATE OR REPLACE FUNCTION public.board_is_live(p_board_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.boards AS b
    WHERE b.id = p_board_id
      AND b.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.board_is_live(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.board_is_live(uuid) TO anon, authenticated;

DROP POLICY "Anyone can read notes on live boards" ON public.notes;
CREATE POLICY "Anyone can read notes on live boards" ON public.notes
  FOR SELECT TO anon, authenticated
  USING (public.board_is_live(notes.board_id));

DROP POLICY "Anyone can add notes to live boards" ON public.notes;
CREATE POLICY "Anyone can add notes to live boards" ON public.notes
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.board_is_live(notes.board_id));

DROP POLICY "Anyone can edit notes on live boards" ON public.notes;
CREATE POLICY "Anyone can edit notes on live boards" ON public.notes
  FOR UPDATE TO anon, authenticated
  USING (public.board_is_live(notes.board_id))
  WITH CHECK (public.board_is_live(notes.board_id));

DROP POLICY "Anyone can remove notes on live boards" ON public.notes;
CREATE POLICY "Anyone can remove notes on live boards" ON public.notes
  FOR DELETE TO anon, authenticated
  USING (public.board_is_live(notes.board_id));

CREATE OR REPLACE FUNCTION public.get_board_by_code(p_code text)
RETURNS TABLE (id uuid, code text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.id, b.code, b.expires_at
  FROM public.boards AS b
  WHERE b.code = p_code
    AND b.expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_board_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_board_by_code(text) TO anon, authenticated;
