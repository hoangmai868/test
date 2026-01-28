-- Migration to fix fileName in template_json
-- This migration extracts fileName from paths like "jobId/category/fileName" to just "fileName"

-- Create a function to extract the last part of a path (after the last /)
CREATE OR REPLACE FUNCTION extract_filename(path TEXT) RETURNS TEXT AS $$
BEGIN
  IF path IS NULL OR path = '' THEN
    RETURN path;
  END IF;
  
  -- If the path contains '/', return the part after the last '/'
  IF position('/' in path) > 0 THEN
    RETURN substring(path from '([^/]+)$');
  END IF;
  
  -- Otherwise, return the path as is
  RETURN path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update template_json for all jobs
-- This updates the fileNames arrays in the template_json structure
UPDATE jobs
SET template_json = (
  SELECT jsonb_agg(
    CASE 
      WHEN jsonb_typeof(group_item) = 'object' AND group_item ? 'groupName' AND group_item ? 'fields' THEN
        jsonb_build_object(
          'groupName', group_item->'groupName',
          'fields', (
            SELECT jsonb_agg(
              CASE
                WHEN field ? 'fileNames' AND jsonb_typeof(field->'fileNames') = 'array' THEN
                  field || jsonb_build_object(
                    'fileNames', (
                      SELECT jsonb_agg(extract_filename(filename::text)::jsonb)
                      FROM jsonb_array_elements_text(field->'fileNames') AS filename
                    )
                  )
                WHEN field ? 'fileIds' AND jsonb_typeof(field->'fileIds') = 'array' THEN
                  field || jsonb_build_object(
                    'fileIds', (
                      SELECT jsonb_agg(extract_filename(fileid::text)::jsonb)
                      FROM jsonb_array_elements_text(field->'fileIds') AS fileid
                    )
                  )
                ELSE field
              END
            )
            FROM jsonb_array_elements(group_item->'fields') AS field
          )
        )
      ELSE group_item
    END
  )
  FROM jsonb_array_elements(template_json) AS group_item
)
WHERE jsonb_typeof(template_json) = 'array';

-- Clean up the function
DROP FUNCTION IF EXISTS extract_filename(TEXT);
