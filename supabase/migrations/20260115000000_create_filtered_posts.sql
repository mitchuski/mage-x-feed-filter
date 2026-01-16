-- Create filtered_posts table for storing negative content filtered from X feed
CREATE TABLE IF NOT EXISTS filtered_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  text TEXT NOT NULL,
  author_handle TEXT,
  author_name TEXT,
  sentiment_score NUMERIC NOT NULL,
  filtered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  original_timestamp TIMESTAMPTZ,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on post_id for quick lookups (avoid duplicates)
CREATE INDEX idx_filtered_posts_post_id ON filtered_posts(post_id);

-- Create index on filtered_at for sorting recent posts
CREATE INDEX idx_filtered_posts_filtered_at ON filtered_posts(filtered_at DESC);

-- Create index on sentiment_score for analytics
CREATE INDEX idx_filtered_posts_sentiment_score ON filtered_posts(sentiment_score DESC);

-- Enable Row Level Security
ALTER TABLE filtered_posts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous inserts (for the Chrome extension)
CREATE POLICY "Allow anonymous inserts" ON filtered_posts
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy to allow anonymous reads (for the Chrome extension popup)
CREATE POLICY "Allow anonymous reads" ON filtered_posts
  FOR SELECT
  TO anon
  USING (true);

-- Add comment to table
COMMENT ON TABLE filtered_posts IS 'Stores negative posts filtered from X (Twitter) feed by the X Feed Filter Chrome extension';

