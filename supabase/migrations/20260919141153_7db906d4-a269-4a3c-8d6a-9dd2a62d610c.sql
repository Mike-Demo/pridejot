CREATE TABLE public.boards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);

CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  x integer NOT NULL DEFAULT 0,
  y integer NOT NULL DEFAULT 0,
  rotation numeric NOT NULL DEFAULT 0,
  color_index integer NOT NULL DEFAULT 0,
  text text NOT NULL DEFAULT '',
  hearts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notes_board_id_idx ON public.notes (board_id);

GRANT SELECT, INSERT ON public.boards TO anon, authenticated;
GRANT ALL ON public.boards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO anon, authenticated;
GRANT ALL ON public.notes TO service_role;

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Boards are shared by link on purpose: anyone with the code may read it and
-- anyone may start a new board. Boards are never updated or deleted by clients.
CREATE POLICY "Anyone can read live boards" ON public.boards
  FOR SELECT TO anon, authenticated USING (expires_at > now());
CREATE POLICY "Anyone can start a board" ON public.boards
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Notes on a live board are fully editable by anyone holding the link.
CREATE POLICY "Anyone can read notes on live boards" ON public.notes
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = notes.board_id AND b.expires_at > now()));
CREATE POLICY "Anyone can add notes to live boards" ON public.notes
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = notes.board_id AND b.expires_at > now()));
CREATE POLICY "Anyone can edit notes on live boards" ON public.notes
  FOR UPDATE TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = notes.board_id AND b.expires_at > now()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = notes.board_id AND b.expires_at > now()));
CREATE POLICY "Anyone can remove notes on live boards" ON public.notes
  FOR DELETE TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = notes.board_id AND b.expires_at > now()));

CREATE OR REPLACE FUNCTION public.set_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notes_set_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_notes_updated_at();

CREATE OR REPLACE FUNCTION public.delete_expired_boards()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.boards WHERE expires_at <= now();
$$;

ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;