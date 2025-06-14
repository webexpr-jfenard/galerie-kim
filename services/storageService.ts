import { createClient } from '@supabase/supabase-js';

export interface Photo {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  size: number;
  createdAt: string;
}

// Supabase configuration - PLEASE UPDATE WITH YOUR REAL CREDENTIALS
const SUPABASE_URL = "https://ugfkyfmthbwqoeauyqlz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZmt5Zm10aGJ3cW9lYXV5cWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjU0MzksImV4cCI6MjA2NTI0MTQzOX0.0hr_vXm8xjkGytwbY0mR6OPs_9SR6hmiv8ucNSaRJ0U"; // This must be a valid JWT token starting with "eyJ..."
const BUCKET_NAME = "photos"; // Your storage bucket name

export class SupabaseService {
  private supabase;
  private isConfigured: boolean;

  constructor() {
    // Check if we have valid configuration
    this.isConfigured = this.validateConfiguration();
    
    if (this.isConfigured) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  }

  private validateConfiguration(): boolean {
    if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL_HERE") {
      console.error('Supabase URL is not configured');
      return false;
    }
    
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "YOUR_REAL_ANON_KEY_HERE" || SUPABASE_ANON_KEY === "22222222") {
      console.error('Supabase anon key is not configured or invalid');
      return false;
    }

    // Check if the anon key looks like a valid JWT (starts with eyJ)
    if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
      console.error('Supabase anon key appears to be invalid - it should start with "eyJ"');
      return false;
    }

    return true;
  }

  async getPhotos(folderPath: string = 'gallery'): Promise<Photo[]> {
    if (!this.isConfigured) {
      throw new Error(`
        Supabase is not properly configured. Please:
        
        1. Go to your Supabase project: https://supabase.com/dashboard/project/ugfkyfmthbwqoeauyqlz
        2. Navigate to Settings > API
        3. Copy your "anon public" key (it starts with "eyJ..." and is very long)
        4. Update SUPABASE_ANON_KEY in /services/storageService.ts
        
        The current API key "${SUPABASE_ANON_KEY}" is not valid.
      `);
    }

    try {
      // List files in the specified folder
      const { data: files, error: listError } = await this.supabase.storage
        .from(BUCKET_NAME)
        .list(folderPath, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError) {
        console.error('Supabase list error:', listError);
        
        // Provide specific error messages for common issues
        if (listError.message.includes('Invalid Compact JWS')) {
          throw new Error('Invalid API key. Please check your Supabase anon key - it should start with "eyJ" and be much longer.');
        } else if (listError.message.includes('The resource was not found')) {
          throw new Error(`Storage bucket "${BUCKET_NAME}" or folder "${folderPath}" not found. Please create this bucket/folder in your Supabase dashboard.`);
        } else {
          throw new Error(`Failed to fetch photos: ${listError.message}`);
        }
      }

      if (!files || files.length === 0) {
        return [];
      }

      // Filter only image files and transform to Photo format
      const imageFiles = files.filter(file => 
        file.name && 
        !file.name.includes('.emptyFolderPlaceholder') && // Skip placeholder files
        (file.name.toLowerCase().endsWith('.jpg') || 
         file.name.toLowerCase().endsWith('.jpeg') || 
         file.name.toLowerCase().endsWith('.png') || 
         file.name.toLowerCase().endsWith('.gif') || 
         file.name.toLowerCase().endsWith('.webp') ||
         file.name.toLowerCase().endsWith('.avif') ||
         file.name.toLowerCase().endsWith('.svg'))
      );

      const photos: Photo[] = [];

      for (const file of imageFiles) {
        try {
          // Get public URL for the file
          const filePath = folderPath ? `${folderPath}/${file.name}` : file.name;
          const { data: publicUrl } = this.supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

          if (publicUrl?.publicUrl) {
            photos.push({
              id: file.id || file.name,
              name: file.name,
              url: publicUrl.publicUrl,
              thumbnailUrl: publicUrl.publicUrl, // Using same URL for thumbnail
              size: file.metadata?.size || 0,
              createdAt: file.created_at || new Date().toISOString()
            });
          }
        } catch (fileError) {
          console.warn(`Error processing file ${file.name}:`, fileError);
        }
      }

      return photos;
    } catch (error) {
      console.error('Supabase API error:', error);
      throw error;
    }
  }

  // Get photos for a specific gallery
  async getGalleryPhotos(galleryId: string): Promise<Photo[]> {
    if (galleryId === 'default') {
      return this.getPhotos('gallery');
    }
    
    // For custom galleries, use their folder name
    const { galleryService } = await import('./galleryService');
    const gallery = galleryService.getGallery(galleryId);
    
    if (!gallery || !gallery.isActive) {
      throw new Error('Gallery not found or inactive');
    }
    
    return this.getPhotos(gallery.folderName);
  }
}

export const storageService = new SupabaseService();