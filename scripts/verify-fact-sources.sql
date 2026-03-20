-- Verify Fact Sources
-- Query to show complete source information for any fact

-- Example 1: Get source information for a specific fact
-- Replace 'fact-uuid-here' with actual fact ID
SELECT 
    f.id as fact_id,
    f.fact_type,
    f.content,
    f.confidence,
    f.fact_date,
    f.created_at as extracted_at,
    
    -- Source document info
    d.s3_key as source_file,
    d.metadata->>'filename' as filename,
    d.metadata->>'document_type' as document_type,
    d.metadata->>'document_date' as document_date,
    d.metadata->>'provider' as provider,
    d.metadata->>'facility' as facility,
    d.upload_date,
    
    -- Occurrence count
    (SELECT COUNT(*) FROM medical.fact_occurrences WHERE fact_id = f.id) as occurrence_count
    
FROM medical.user_facts f
LEFT JOIN medical.documents d ON f.source_document_id = d.id
WHERE f.id = 'fact-uuid-here'
AND f.is_active = TRUE;

-- Example 2: Get all occurrences of a fact with their sources
SELECT 
    f.content as fact,
    o.occurrence_date,
    o.original_content,
    o.confidence,
    d.s3_key as source_file,
    d.metadata->>'filename' as filename,
    d.metadata->>'document_date' as document_date,
    o.created_at as extracted_at
    
FROM medical.user_facts f
JOIN medical.fact_occurrences o ON o.fact_id = f.id
JOIN medical.documents d ON o.source_document_id = d.id
WHERE f.id = 'fact-uuid-here'
ORDER BY o.occurrence_date DESC;

-- Example 3: Get all facts from a specific document
SELECT 
    f.fact_type,
    f.content,
    f.confidence,
    f.fact_date,
    d.metadata->>'filename' as source_file,
    d.metadata->>'document_date' as document_date
    
FROM medical.user_facts f
JOIN medical.documents d ON f.source_document_id = d.id
WHERE d.id = 'document-uuid-here'
AND f.is_active = TRUE
ORDER BY f.fact_type, f.content;

-- Example 4: Find facts without source documents (should be none)
SELECT 
    f.id,
    f.fact_type,
    f.content,
    f.source_type,
    f.created_at
    
FROM medical.user_facts f
WHERE f.source_document_id IS NULL
AND f.is_active = TRUE
ORDER BY f.created_at DESC;

-- Example 5: Get facts with low confidence that need verification
SELECT 
    f.id,
    f.fact_type,
    f.content,
    f.confidence,
    d.metadata->>'filename' as source_file,
    d.s3_key,
    f.fact_date
    
FROM medical.user_facts f
JOIN medical.documents d ON f.source_document_id = d.id
WHERE f.confidence < 0.7
AND f.is_active = TRUE
ORDER BY f.confidence ASC, f.created_at DESC
LIMIT 20;

-- Example 6: Get complete audit trail for a fact
SELECT 
    'Primary Fact' as record_type,
    f.content,
    f.confidence,
    f.fact_date,
    d.metadata->>'filename' as source,
    f.created_at as timestamp
FROM medical.user_facts f
JOIN medical.documents d ON f.source_document_id = d.id
WHERE f.id = 'fact-uuid-here'

UNION ALL

SELECT 
    'Occurrence' as record_type,
    o.original_content as content,
    o.confidence,
    o.occurrence_date as fact_date,
    d2.metadata->>'filename' as source,
    o.created_at as timestamp
FROM medical.fact_occurrences o
JOIN medical.documents d2 ON o.source_document_id = d2.id
WHERE o.fact_id = 'fact-uuid-here'

ORDER BY timestamp DESC;
