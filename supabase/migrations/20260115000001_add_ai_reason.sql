-- Add ai_reason column to store the AI's explanation for filtering
ALTER TABLE filtered_posts ADD COLUMN IF NOT EXISTS ai_reason TEXT;

-- Add comment
COMMENT ON COLUMN filtered_posts.ai_reason IS 'AI-generated explanation for why this post was filtered';

