# Photo Gallery - Supabase Integration

This photo gallery is configured to work directly with Supabase storage. Follow the setup instructions in `/SUPABASE_SETUP.md` to connect your Supabase project.

## Features
- ✅ Direct Supabase integration
- ✅ Real-time photo loading from your storage bucket
- ✅ Photo selection with checkboxes
- ✅ Email submission of selected photos
- ✅ Responsive design
- ✅ Support for all common image formats

## Quick Start
1. Install dependencies: `npm install @supabase/supabase-js`
2. Follow the setup guide in `/SUPABASE_SETUP.md`
3. Update your credentials in `/services/storageService.ts`
4. Upload photos to your Supabase storage bucket
5. Start the app and enjoy your photo gallery!

## Configuration
All configuration is done in `/services/storageService.ts` - simply replace the placeholder values with your actual Supabase credentials.

No complex API configuration needed - just plug in your credentials and go!