CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY,
  instagram_user_id TEXT UNIQUE NOT NULL,
  instagram_username TEXT,
  source TEXT NOT NULL DEFAULT 'instagram',
  campaign TEXT,
  trigger_keyword TEXT,
  interest TEXT,
  devices INTEGER,
  temperature TEXT NOT NULL DEFAULT 'cold' CHECK (temperature IN ('cold','warm','hot')),
  stage TEXT NOT NULL DEFAULT 'new',
  needs_human BOOLEAN NOT NULL DEFAULT FALSE,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_messages (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  body TEXT NOT NULL,
  meta_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_messages_lead_created
  ON lead_messages(lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
