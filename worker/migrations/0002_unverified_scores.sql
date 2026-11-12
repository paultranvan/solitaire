-- Past wins: games won before the leaderboard existed. The app kept their
-- duration and move count but not the moves, so they can't be replayed; they
-- are stored with verified = 0 and the date the player gave. The flag is for
-- moderation only — players see these entries like any other.
--
-- played_at is NULL for verified rows, whose date is created_at. created_at
-- stays the moment the row reached the server for every row, which is what
-- moderation needs ("everything unverified that arrived after …").
ALTER TABLE scores ADD COLUMN verified INTEGER NOT NULL DEFAULT 1 CHECK (verified IN (0, 1));
ALTER TABLE scores ADD COLUMN played_at INTEGER;
