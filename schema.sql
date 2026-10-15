CREATE TABLE IF NOT EXISTS public.projects (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  status text NOT NULL CHECK (status IN ('Planned', 'In Progress', 'Completed'))
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
-- No browser Data API policies. Express uses the server-only database connection.
