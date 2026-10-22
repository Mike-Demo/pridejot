REVOKE ALL ON public.boards, public.notes FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone can read live boards" ON public.boards;
DROP POLICY IF EXISTS "Anyone can start a board" ON public.boards;
DROP POLICY IF EXISTS "Anyone can read notes on live boards" ON public.notes;
DROP POLICY IF EXISTS "Anyone can add notes to live boards" ON public.notes;
DROP POLICY IF EXISTS "Anyone can edit notes on live boards" ON public.notes;
DROP POLICY IF EXISTS "Anyone can remove notes on live boards" ON public.notes;

CREATE OR REPLACE FUNCTION public.board_create(p_code text)
RETURNS TABLE(id uuid, code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_board public.boards;
BEGIN
  IF p_code !~ '^[A-Z2-9]{6}$' THEN
    RAISE EXCEPTION 'Invalid board code' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.boards (code)
  VALUES (p_code)
  RETURNING * INTO created_board;

  RETURN QUERY SELECT created_board.id, created_board.code, created_board.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.board_get_by_code(p_code text)
RETURNS TABLE(id uuid, code text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.code, b.expires_at
  FROM public.boards b
  WHERE b.code = p_code AND b.expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.board_list_notes(p_board_id uuid, p_code text)
RETURNS TABLE(
  id uuid,
  board_id uuid,
  x integer,
  y integer,
  rotation numeric,
  color_index integer,
  text text,
  hearts integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.id, n.board_id, n.x, n.y, n.rotation, n.color_index, n.text, n.hearts
  FROM public.notes n
  JOIN public.boards b ON b.id = n.board_id
  WHERE b.id = p_board_id AND b.code = p_code AND b.expires_at > now()
  ORDER BY n.created_at;
$$;

CREATE OR REPLACE FUNCTION public.board_insert_note(
  p_code text,
  p_board_id uuid,
  p_id uuid,
  p_x integer,
  p_y integer,
  p_rotation numeric,
  p_color_index integer,
  p_text text,
  p_hearts integer
)
RETURNS TABLE(
  id uuid,
  board_id uuid,
  x integer,
  y integer,
  rotation numeric,
  color_index integer,
  text text,
  hearts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.boards b
    WHERE b.id = p_board_id AND b.code = p_code AND b.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Board credential is invalid or expired' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO public.notes AS n (id, board_id, x, y, rotation, color_index, text, hearts)
  VALUES (
    COALESCE(p_id, gen_random_uuid()),
    p_board_id,
    p_x,
    p_y,
    p_rotation,
    p_color_index,
    p_text,
    p_hearts
  )
  RETURNING n.id, n.board_id, n.x, n.y, n.rotation, n.color_index, n.text, n.hearts;
END;
$$;

CREATE OR REPLACE FUNCTION public.board_update_note(
  p_code text,
  p_note_id uuid,
  p_x integer DEFAULT NULL,
  p_y integer DEFAULT NULL,
  p_text text DEFAULT NULL,
  p_hearts integer DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notes n
  SET x = COALESCE(p_x, n.x),
      y = COALESCE(p_y, n.y),
      text = COALESCE(p_text, n.text),
      hearts = COALESCE(p_hearts, n.hearts)
  FROM public.boards b
  WHERE n.id = p_note_id
    AND b.id = n.board_id
    AND b.code = p_code
    AND b.expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.board_delete_note(p_code text, p_note_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.notes n
  USING public.boards b
  WHERE n.id = p_note_id
    AND b.id = n.board_id
    AND b.code = p_code
    AND b.expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.board_clear_notes(p_board_id uuid, p_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.notes n
  USING public.boards b
  WHERE n.board_id = p_board_id
    AND b.id = n.board_id
    AND b.code = p_code
    AND b.expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.can_access_board_topic(p_topic text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.boards b
    WHERE p_topic = 'board-' || b.id::text || '-' || b.code
      AND b.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.board_create(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.board_get_by_code(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.board_list_notes(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.board_insert_note(text, uuid, uuid, integer, integer, numeric, integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.board_update_note(text, uuid, integer, integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.board_delete_note(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.board_clear_notes(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_access_board_topic(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.board_create(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.board_get_by_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.board_list_notes(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.board_insert_note(text, uuid, uuid, integer, integer, numeric, integer, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.board_update_note(text, uuid, integer, integer, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.board_delete_note(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.board_clear_notes(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_board_topic(text) TO anon, authenticated;

CREATE POLICY "Board code grants realtime access"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (public.can_access_board_topic(realtime.topic()));

CREATE OR REPLACE FUNCTION public.broadcast_note_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime
AS $$
DECLARE
  changed_board_id uuid;
  board_code text;
BEGIN
  changed_board_id := COALESCE(NEW.board_id, OLD.board_id);
  SELECT b.code INTO board_code
  FROM public.boards b
  WHERE b.id = changed_board_id;

  IF board_code IS NOT NULL THEN
    PERFORM realtime.broadcast_changes(
      'board-' || changed_board_id::text || '-' || board_code,
      'notes_changed',
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.broadcast_note_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notes_broadcast_change
AFTER INSERT OR UPDATE OR DELETE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.broadcast_note_change();

ALTER PUBLICATION supabase_realtime DROP TABLE public.notes;
