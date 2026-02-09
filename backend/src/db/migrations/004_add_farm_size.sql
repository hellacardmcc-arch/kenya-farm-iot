-- Add farm_size column to farmers table
ALTER TABLE farmers 
ADD COLUMN IF NOT EXISTS farm_size DECIMAL(5, 2);

-- Note: Keeping phone column as VARCHAR(20) to support both formats:
-- - Kenyan format: 0712345678 (10 chars)
-- - International format: 254723997119 (12 chars)
-- If you want to enforce 10-char format, update existing data first:
-- UPDATE farmers SET phone = RIGHT(phone, 10) WHERE LENGTH(phone) > 10;
-- Then run: ALTER TABLE farmers ALTER COLUMN phone TYPE VARCHAR(10);

-- Make password_hash nullable (for simplified registration)
ALTER TABLE farmers 
ALTER COLUMN password_hash DROP NOT NULL;

-- Make name and county required (if they should be)
-- Note: This will fail if existing rows have NULL values
-- Uncomment only if you want to enforce NOT NULL:
-- ALTER TABLE farmers ALTER COLUMN name SET NOT NULL;
-- ALTER TABLE farmers ALTER COLUMN county SET NOT NULL;
