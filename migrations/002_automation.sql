CREATE TABLE IF NOT EXISTS automation_jobs (
  id UUID PRIMARY KEY,
  agent TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'image',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','ready','publishing','published','failed')),
  topic TEXT NOT NULL,
  objective TEXT NOT NULL,
  caption TEXT,
  image_prompt TEXT,
  asset_id UUID,
  scheduled_for TIMESTAMPTZ,
  published_media_id TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_jobs_status_schedule
  ON automation_jobs(status, scheduled_for);

CREATE TABLE IF NOT EXISTS content_assets (
  id UUID PRIMARY KEY,
  mime_type TEXT NOT NULL,
  bytes BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY,
  agent TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
