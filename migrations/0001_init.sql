-- One row per person per course. state is the app's progress object as JSON; version goes up on every save.
CREATE TABLE progress (
  user_id    TEXT    NOT NULL,
  course_id  TEXT    NOT NULL,
  state_json TEXT    NOT NULL,
  updated_at INTEGER NOT NULL,
  version    INTEGER NOT NULL,
  PRIMARY KEY (user_id, course_id)
);

-- AI calls per person per UTC day. user_id '*' holds the total for everyone.
CREATE TABLE ai_usage (
  user_id TEXT    NOT NULL,
  day     TEXT    NOT NULL,
  calls   INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);
