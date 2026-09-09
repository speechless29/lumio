ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS safety_level VARCHAR(20)
CHECK (
  safety_level IN (
    'none',
    'concern',
    'imminent'
  )
);