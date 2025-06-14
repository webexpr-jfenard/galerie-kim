# Supabase Setup Instructions

To connect your photo gallery to Supabase, follow these simple steps:

## 1. Install Supabase Client
```bash
npm install @supabase/supabase-js
```

## 2. Get Your Supabase Credentials
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings > API
4. Copy your:
   - **Project URL** (looks like: `https://your-project.supabase.co`)
   - **Anon public key** (long string starting with `eyJ...`)

## 3. Set Up Storage Bucket
1. In your Supabase dashboard, go to **Storage**
2. Create a new bucket named `photos` (or use your preferred name)
3. Make the bucket **public** for photo access
4. Create a folder named `gallery` inside the bucket
5. Upload your photos to this folder

## 4. Configure the App
1. Open `/services/storageService.ts`
2. Replace the placeholder values:
   ```typescript
   const SUPABASE_URL = "https://your-project.supabase.co";
   const SUPABASE_ANON_KEY = "your-anon-key-here";
   const BUCKET_NAME = "photos"; // Your bucket name
   const FOLDER_PATH = "gallery"; // Your folder name (or "" for root)
   ```

## 5. Set Storage Policies (for public access)
In your Supabase dashboard, go to Storage > Policies and add:

```sql
-- Allow public read access to photos bucket
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'photos');
```

## 6. Test Your Setup
1. Save your changes
2. Refresh the gallery
3. Your photos should now load from Supabase!

## Supported Image Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- AVIF (.avif)
- SVG (.svg)

## Troubleshooting
- **No photos loading**: Check your bucket name and folder path
- **403 errors**: Ensure your bucket is public and has the correct policies
- **CORS errors**: Make sure your Supabase project allows requests from your domain