-- =============================================
-- SUPABASE TABLE SETUP FOR PHOTO GALLERY APP
-- =============================================
-- This SQL script creates the necessary tables for the photo gallery application
-- Execute this in your Supabase SQL Editor

-- 1. Create the galleries table
CREATE TABLE IF NOT EXISTS galleries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT TRUE,
  password TEXT,
  bucket_folder TEXT,
  bucket_name TEXT DEFAULT 'photos',
  photo_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  allow_comments BOOLEAN DEFAULT TRUE,
  allow_favorites BOOLEAN DEFAULT TRUE
);

-- 2. Create the favorites table for photo selections
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  device_id TEXT NOT NULL, -- To identify the device/session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure one favorite per photo per device
  UNIQUE(gallery_id, photo_id, device_id)
);

-- 3. Create the comments table for photo comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  device_id TEXT NOT NULL, -- To identify the device/session
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_galleries_created_at ON galleries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_galleries_bucket ON galleries(bucket_name, bucket_folder);
CREATE INDEX IF NOT EXISTS idx_galleries_public ON galleries(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_favorites_gallery_id ON favorites(gallery_id);
CREATE INDEX IF NOT EXISTS idx_favorites_device_id ON favorites(device_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_gallery_id ON comments(gallery_id);
CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_comments_device_id ON comments(device_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- 5. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_galleries_updated_at ON galleries;
CREATE TRIGGER update_galleries_updated_at
    BEFORE UPDATE ON galleries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_favorites_updated_at ON favorites;
CREATE TRIGGER update_favorites_updated_at
    BEFORE UPDATE ON favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 8. Create policies to allow all operations for now (adjust based on your security needs)
-- You can modify these policies based on your authentication requirements
DROP POLICY IF EXISTS "Allow all operations on galleries" ON galleries;
CREATE POLICY "Allow all operations on galleries" ON galleries
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on favorites" ON favorites;
CREATE POLICY "Allow all operations on favorites" ON favorites
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on comments" ON comments;
CREATE POLICY "Allow all operations on comments" ON comments
    FOR ALL USING (true);

-- Alternative: More restrictive policy examples (commented out)
-- This would require authentication and proper user roles
-- DROP POLICY IF EXISTS "Allow read access to public galleries" ON galleries;
-- CREATE POLICY "Allow read access to public galleries" ON galleries
--     FOR SELECT USING (is_public = true OR auth.role() = 'authenticated');

-- DROP POLICY IF EXISTS "Allow admin to manage galleries" ON galleries;
-- CREATE POLICY "Allow admin to manage galleries" ON galleries
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 9. Grant necessary permissions
GRANT ALL ON galleries TO anon;
GRANT ALL ON galleries TO authenticated;
GRANT ALL ON favorites TO anon;
GRANT ALL ON favorites TO authenticated;
GRANT ALL ON comments TO anon;
GRANT ALL ON comments TO authenticated;

-- 10. Verify table creation
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('galleries', 'favorites', 'comments')
ORDER BY table_name, ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database setup completed successfully!';
    RAISE NOTICE '📋 Created tables: galleries, favorites, comments';
    RAISE NOTICE '🔗 All tables have proper indexes and triggers';
    RAISE NOTICE '🚀 You can now use the photo gallery application with full Supabase sync!';
END $$;