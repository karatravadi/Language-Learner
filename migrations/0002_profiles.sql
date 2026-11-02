-- One row per person, shared by every course: the name the lessons use ({name}) and the endings they prefer.
-- user_id is the signed-in email from Cloudflare Access, as in progress and ai_usage.
-- fem is 1 (cansada), 0 (cansado) or NULL (not chosen yet: the Latin course does not ask).
CREATE TABLE profiles (
  user_id    TEXT    NOT NULL PRIMARY KEY,
  name       TEXT    NOT NULL,
  fem        INTEGER,
  updated_at INTEGER NOT NULL
);
