-- Update relationship dates to span several months for timeline testing
-- This creates a realistic medical history timeline

-- Get the relationship IDs
WITH relationships AS (
  SELECT id, relationship_type, ROW_NUMBER() OVER (ORDER BY id) as rn
  FROM medical.relationships
)
UPDATE medical.relationships r
SET 
  valid_from = CASE 
    -- Oldest relationships (6 months ago)
    WHEN rel.rn IN (1, 2) THEN NOW() - INTERVAL '6 months'
    -- 4 months ago
    WHEN rel.rn IN (3, 4) THEN NOW() - INTERVAL '4 months'
    -- 2 months ago
    WHEN rel.rn IN (5, 6) THEN NOW() - INTERVAL '2 months'
    -- 1 month ago
    WHEN rel.rn IN (7) THEN NOW() - INTERVAL '1 month'
    -- Recent (1 week ago)
    WHEN rel.rn IN (8, 9) THEN NOW() - INTERVAL '1 week'
    ELSE NOW()
  END,
  valid_until = CASE
    -- Some relationships ended (medication stopped, etc.)
    WHEN rel.rn IN (1) THEN NOW() - INTERVAL '3 months'  -- Ended 3 months ago
    WHEN rel.rn IN (3) THEN NOW() - INTERVAL '1 month'   -- Ended 1 month ago
    -- Others are still active (NULL means ongoing)
    ELSE NULL
  END
FROM relationships rel
WHERE r.id = rel.id;

-- Verify the changes
SELECT 
  relationship_type,
  valid_from::date as start_date,
  valid_until::date as end_date,
  CASE 
    WHEN valid_until IS NULL THEN 'Active'
    ELSE 'Ended'
  END as status
FROM medical.relationships
ORDER BY valid_from;
