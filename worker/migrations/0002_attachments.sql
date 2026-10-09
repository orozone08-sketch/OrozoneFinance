CREATE TABLE attachments (
 id TEXT PRIMARY KEY,
 object_key TEXT NOT NULL UNIQUE,
 filename TEXT NOT NULL,
 content_type TEXT NOT NULL,
 size INTEGER NOT NULL CHECK(size > 0 AND size <= 10485760),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
