-- One row per verified win. A deal (seed + draw mode) can appear only once:
-- the first verified submission for it stands, so replaying a known deal
-- can't be used to improve an entry.
CREATE TABLE scores (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  draw_count   INTEGER NOT NULL CHECK (draw_count IN (1, 3)),
  score        INTEGER NOT NULL,
  duration_sec INTEGER NOT NULL,
  moves        INTEGER NOT NULL,
  name         TEXT    NOT NULL,
  seed         TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  UNIQUE (seed, draw_count)
);

-- Serves both the top-N listing and the "how many scores beat this one" count.
CREATE INDEX scores_by_rank ON scores (draw_count, score DESC, created_at ASC);
