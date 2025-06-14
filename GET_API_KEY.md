# How to Get Your Supabase API Key

The error you're seeing means the API key "22222222" is not valid. Here's how to get your real Supabase API key:

## Step 1: Go to Your Supabase Project
Visit: https://supabase.com/dashboard/project/ugfkyfmthbwqoeauyqlz/settings/api

## Step 2: Find Your API Key
Look for the section called "Project API keys" and copy the **"anon public"** key.

**Important:** The real API key will:
- Start with "eyJ" 
- Be very long (hundreds of characters)
- Look something like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZmt5Zm10aGJ3cW9lYXV5cWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODUwNTQwNzEsImV4cCI6MjAwMDYzMDA3MX0.EXAMPLE_KEY_HERE`

## Step 3: Update Your Code
1. Open `/services/storageService.ts`
2. Replace this line:
   ```typescript
   const SUPABASE_ANON_KEY = "YOUR_REAL_ANON_KEY_HERE";
   ```
   
   With your actual key:
   ```typescript
   const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-actual-key-here";
   ```

## Step 4: Set Up Storage
1. Go to Storage in your Supabase dashboard
2. Create a bucket called "photos"
3. Create a folder called "gallery" inside the bucket
4. Upload some images to test
5. Make sure the bucket allows public access

## Step 5: Test
Refresh your photo gallery - it should now load your photos!

---

**Need help?** 
- Check if your bucket exists: https://supabase.com/dashboard/project/ugfkyfmthbwqoeauyqlz/storage/buckets
- View storage policies: https://supabase.com/dashboard/project/ugfkyfmthbwqoeauyqlz/storage/policies