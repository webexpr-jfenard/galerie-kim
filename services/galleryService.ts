import { supabaseService } from './supabaseService';
import type { StorageFile } from './supabaseService';

export interface Gallery {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  password?: string;
  bucketFolder?: string; // Supabase bucket folder path
  bucketName?: string; // Supabase bucket name (default: 'photos')
  photoCount?: number;
  viewCount?: number;
  allowComments?: boolean;
  allowFavorites?: boolean;
}

export interface Photo {
  id: string;
  galleryId: string;
  name: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  uploadedAt: string;
  size: number;
  width?: number;
  height?: number;
  mimeType: string;
  isSelected?: boolean;
  bucketPath?: string; // Full path in Supabase bucket
  supabaseFile?: StorageFile; // Original Supabase file metadata
}

class GalleryService {
  private readonly LOCAL_STORAGE_KEY = 'photo-galleries'; // For migration only
  private readonly PHOTOS_KEY = 'gallery-photos';
  private readonly AUTH_KEY = 'gallery-auth-sessions';
  private readonly DEFAULT_BUCKET = 'photos'; // Default Supabase bucket name
  private readonly GALLERIES_TABLE = 'galleries'; // Supabase table name
  
  private migrationComplete = false;

  // Initialize and ensure table exists
  private async ensureTableExists(): Promise<void> {
    if (!supabaseService.isReady()) {
      console.warn('⚠️ Supabase not ready - this should not happen with hardcoded config');
      return;
    }

    try {
      // Try to create table if it doesn't exist
      console.log('🔧 Ensuring galleries table exists...');
      
      // Test if table exists by trying to select from it
      const { data, error } = await supabaseService.client
        .from(this.GALLERIES_TABLE)
        .select('id')
        .limit(1);
      
      if (error && error.code === 'PGRST116') { // Table not found
        console.log('📋 Creating galleries table...');
        
        // Create table using SQL
        const { error: createError } = await supabaseService.client.rpc('create_galleries_table');
        
        if (createError) {
          console.warn('⚠️  Could not create galleries table automatically:', createError.message);
          console.log('📝 Please create the table manually in Supabase dashboard:');
          console.log(`
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
          `);
        } else {
          console.log('✅ Galleries table created successfully');
        }
      } else {
        console.log('✅ Galleries table already exists');
      }
    } catch (error) {
      console.error('❌ Error ensuring table exists:', error);
      // Continue anyway - user might need to create table manually
    }
  }

  // Migrate local galleries to Supabase (one-time operation)
  private async migrateLocalGalleries(): Promise<void> {
    if (this.migrationComplete || !supabaseService.isReady()) {
      return;
    }

    try {
      console.log('🔄 Checking for local galleries to migrate...');
      
      const localData = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (!localData) {
        this.migrationComplete = true;
        return;
      }

      const localGalleries = JSON.parse(localData);
      if (!Array.isArray(localGalleries) || localGalleries.length === 0) {
        this.migrationComplete = true;
        return;
      }

      console.log(`📦 Found ${localGalleries.length} local galleries to migrate`);

      // Transform local format to Supabase format
      const supabaseGalleries = localGalleries.map(gallery => ({
        id: gallery.id,
        name: gallery.name,
        description: gallery.description || null,
        created_at: gallery.createdAt,
        updated_at: gallery.updatedAt,
        is_public: gallery.isPublic,
        password: gallery.password || null,
        bucket_folder: gallery.bucketFolder || null,
        bucket_name: gallery.bucketName || this.DEFAULT_BUCKET,
        photo_count: gallery.photoCount || 0,
        view_count: gallery.viewCount || 0,
        allow_comments: gallery.allowComments !== false,
        allow_favorites: gallery.allowFavorites !== false
      }));

      // Insert galleries into Supabase (upsert to handle duplicates)
      const { error } = await supabaseService.client
        .from(this.GALLERIES_TABLE)
        .upsert(supabaseGalleries, {
          onConflict: 'id'
        });

      if (error) {
        console.error('❌ Error migrating galleries:', error);
        throw error;
      }

      console.log('✅ Successfully migrated galleries to Supabase');
      
      // Backup local data and clear it
      localStorage.setItem(`${this.LOCAL_STORAGE_KEY}-backup`, localData);
      localStorage.removeItem(this.LOCAL_STORAGE_KEY);
      
      this.migrationComplete = true;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      // Don't mark as complete so it can be retried
    }
  }

  // Gallery Management - Using Supabase (always configured now)
  async getGalleries(): Promise<Gallery[]> {
    try {
      // With hardcoded credentials, Supabase should always be ready
      if (!supabaseService.isReady()) {
        console.error('❌ Supabase should be ready with hardcoded config');
        return this.getLocalGalleries();
      }

      await this.ensureTableExists();
      await this.migrateLocalGalleries();

      console.log('📂 Fetching galleries from Supabase...');
      
      const { data, error } = await supabaseService.client
        .from(this.GALLERIES_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching galleries from Supabase:', error);
        // Fallback to local storage if Supabase fails
        return this.getLocalGalleries();
      }

      // Transform Supabase format to our interface
      const galleries: Gallery[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isPublic: row.is_public,
        password: row.password || undefined,
        bucketFolder: row.bucket_folder || undefined,
        bucketName: row.bucket_name || this.DEFAULT_BUCKET,
        photoCount: row.photo_count || 0,
        viewCount: row.view_count || 0,
        allowComments: row.allow_comments !== false,
        allowFavorites: row.allow_favorites !== false
      }));

      console.log(`✅ Loaded ${galleries.length} galleries from Supabase`);
      return galleries;
      
    } catch (error) {
      console.error('❌ Error loading galleries:', error);
      // Final fallback to local storage
      return this.getLocalGalleries();
    }
  }

  // Fallback method for local storage
  private async getLocalGalleries(): Promise<Gallery[]> {
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (!stored) return [];
      
      const galleries = JSON.parse(stored);
      return Array.isArray(galleries) ? galleries : [];
    } catch (error) {
      console.error('Error loading local galleries:', error);
      return [];
    }
  }

  async getGallery(id: string): Promise<Gallery | null> {
    try {
      console.log(`🔍 Looking for gallery: ${id}`);
      
      if (!supabaseService.isReady()) {
        console.log('⚠️  Supabase not ready, checking local storage');
        const galleries = await this.getLocalGalleries();
        const found = galleries.find(g => g.id === id) || null;
        console.log(found ? `✅ Found gallery locally: ${found.name}` : `❌ Gallery ${id} not found locally`);
        return found;
      }

      await this.ensureTableExists();
      await this.migrateLocalGalleries(); // Ensure migration is complete

      console.log(`📡 Fetching gallery ${id} from Supabase...`);
      const { data, error } = await supabaseService.client
        .from(this.GALLERIES_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`❌ Error fetching gallery ${id} from Supabase:`, error);
        
        if (error.code === 'PGRST116' || error.code === 'PGRST117') {
          // Table doesn't exist or no results found
          console.log('📂 Falling back to local storage...');
          const galleries = await this.getLocalGalleries();
          const found = galleries.find(g => g.id === id) || null;
          console.log(found ? `✅ Found gallery locally: ${found.name}` : `❌ Gallery ${id} not found locally either`);
          return found;
        }
        
        return null;
      }

      if (!data) {
        console.log(`❌ No data returned for gallery ${id}`);
        return null;
      }

      // Transform to our interface
      const gallery = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isPublic: data.is_public,
        password: data.password || undefined,
        bucketFolder: data.bucket_folder || undefined,
        bucketName: data.bucket_name || this.DEFAULT_BUCKET,
        photoCount: data.photo_count || 0,
        viewCount: data.view_count || 0,
        allowComments: data.allow_comments !== false,
        allowFavorites: data.allow_favorites !== false
      };

      console.log(`✅ Found gallery in Supabase: ${gallery.name}`);
      return gallery;
      
    } catch (error) {
      console.error(`❌ Error loading gallery ${id}:`, error);
      
      // Final fallback to local storage
      try {
        console.log('🔄 Final fallback to local storage...');
        const galleries = await this.getLocalGalleries();
        const found = galleries.find(g => g.id === id) || null;
        console.log(found ? `✅ Found gallery in final fallback: ${found.name}` : `❌ Gallery ${id} not found anywhere`);
        return found;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  // Alias for compatibility
  async getGalleryById(id: string): Promise<Gallery | null> {
    return this.getGallery(id);
  }

  // Force sync from Supabase - useful when a gallery is not found locally
  async syncFromSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      if (!supabaseService.isReady()) {
        return { success: false, count: 0, error: 'Supabase not configured' };
      }

      await this.ensureTableExists();
      
      console.log('🔄 Syncing galleries from Supabase...');
      
      const { data, error } = await supabaseService.client
        .from(this.GALLERIES_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error syncing from Supabase:', error);
        return { success: false, count: 0, error: error.message };
      }

      const supabaseGalleries = data || [];
      console.log(`📦 Found ${supabaseGalleries.length} galleries in Supabase`);

      // For now, we don't store galleries locally anymore since we fetch directly from Supabase
      // But we could cache them for offline access if needed
      
      return { success: true, count: supabaseGalleries.length };
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      return { success: false, count: 0, error: 'Sync failed' };
    }
  }

  async createGallery(options?: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    password?: string;
    bucketFolder?: string;
    bucketName?: string;
    allowComments?: boolean;
    allowFavorites?: boolean;
  }): Promise<Gallery> {
    try {
      const id = this.generateId();
      const now = new Date().toISOString();
      
      // Generate bucket folder if not provided
      const bucketFolder = options?.bucketFolder || `gallery-${id}`;
      const bucketName = options?.bucketName || this.DEFAULT_BUCKET;
      
      const newGallery: Gallery = {
        id,
        name: options?.name || `Gallery ${id}`,
        description: options?.description || undefined,
        createdAt: now,
        updatedAt: now,
        isPublic: options?.isPublic ?? true,
        password: options?.password,
        bucketFolder,
        bucketName,
        photoCount: 0,
        viewCount: 0,
        allowComments: options?.allowComments ?? true,
        allowFavorites: options?.allowFavorites ?? true
      };

      // With hardcoded credentials, always use Supabase
      if (supabaseService.isReady()) {
        await this.ensureTableExists();

        // Insert into Supabase
        const { error } = await supabaseService.client
          .from(this.GALLERIES_TABLE)
          .insert([{
            id: newGallery.id,
            name: newGallery.name,
            description: newGallery.description || null,
            created_at: newGallery.createdAt,
            updated_at: newGallery.updatedAt,
            is_public: newGallery.isPublic,
            password: newGallery.password || null,
            bucket_folder: newGallery.bucketFolder,
            bucket_name: newGallery.bucketName,
            photo_count: newGallery.photoCount,
            view_count: newGallery.viewCount,
            allow_comments: newGallery.allowComments,
            allow_favorites: newGallery.allowFavorites
          }]);

        if (error) {
          console.error('Error creating gallery in Supabase:', error);
          throw new Error(`Failed to create gallery: ${error.message}`);
        }

        // Create folder in Supabase storage
        try {
          await supabaseService.createFolder(bucketName, bucketFolder);
          console.log(`✅ Created Supabase folder: ${bucketName}/${bucketFolder}`);
        } catch (error) {
          console.warn('⚠️ Could not create Supabase folder:', error);
        }

        console.log('✅ Gallery created in Supabase:', newGallery.id);
      } else {
        // This should not happen with hardcoded config, but keep as fallback
        const galleries = await this.getLocalGalleries();
        galleries.push(newGallery);
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(galleries));
        console.log('✅ Gallery created locally (fallback):', newGallery.id);
      }
      
      return newGallery;
    } catch (error) {
      console.error('Error creating gallery:', error);
      throw new Error('Failed to create gallery');
    }
  }

  async updateGallery(id: string, updates: Partial<Gallery>): Promise<Gallery | null> {
    try {
      const updatedAt = new Date().toISOString();
      
      if (supabaseService.isReady()) {
        await this.ensureTableExists();

        // Transform updates to Supabase format
        const supabaseUpdates: any = {
          updated_at: updatedAt
        };

        if (updates.name !== undefined) supabaseUpdates.name = updates.name;
        if (updates.description !== undefined) supabaseUpdates.description = updates.description || null;
        if (updates.isPublic !== undefined) supabaseUpdates.is_public = updates.isPublic;
        if (updates.password !== undefined) supabaseUpdates.password = updates.password || null;
        if (updates.bucketFolder !== undefined) supabaseUpdates.bucket_folder = updates.bucketFolder;
        if (updates.bucketName !== undefined) supabaseUpdates.bucket_name = updates.bucketName;
        if (updates.photoCount !== undefined) supabaseUpdates.photo_count = updates.photoCount;
        if (updates.viewCount !== undefined) supabaseUpdates.view_count = updates.viewCount;
        if (updates.allowComments !== undefined) supabaseUpdates.allow_comments = updates.allowComments;
        if (updates.allowFavorites !== undefined) supabaseUpdates.allow_favorites = updates.allowFavorites;

        const { data, error } = await supabaseService.client
          .from(this.GALLERIES_TABLE)
          .update(supabaseUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating gallery in Supabase:', error);
          return null;
        }

        if (!data) return null;

        // Transform back to our interface
        return {
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          isPublic: data.is_public,
          password: data.password || undefined,
          bucketFolder: data.bucket_folder || undefined,
          bucketName: data.bucket_name || this.DEFAULT_BUCKET,
          photoCount: data.photo_count || 0,
          viewCount: data.view_count || 0,
          allowComments: data.allow_comments !== false,
          allowFavorites: data.allow_favorites !== false
        };
      } else {
        // Fallback to local storage
        const galleries = await this.getLocalGalleries();
        const index = galleries.findIndex(g => g.id === id);
        
        if (index === -1) return null;
        
        galleries[index] = {
          ...galleries[index],
          ...updates,
          updatedAt
        };
        
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(galleries));
        return galleries[index];
      }
    } catch (error) {
      console.error('Error updating gallery:', error);
      return null;
    }
  }

  async deleteGallery(id: string): Promise<boolean> {
    try {
      const gallery = await this.getGallery(id);
      if (!gallery) return false;

      if (supabaseService.isReady()) {
        // Delete photos from Supabase storage first
        if (gallery.bucketName && gallery.bucketFolder) {
          try {
            const files = await supabaseService.listFiles(gallery.bucketName, gallery.bucketFolder);
            for (const file of files) {
              const filePath = `${gallery.bucketFolder}/${file.name}`;
              await supabaseService.deleteFile(gallery.bucketName, filePath);
            }
            console.log(`✅ Deleted all photos from ${gallery.bucketName}/${gallery.bucketFolder}`);
          } catch (error) {
            console.warn('⚠️ Could not delete Supabase photos:', error);
          }
        }

        // Delete gallery from Supabase
        const { error } = await supabaseService.client
          .from(this.GALLERIES_TABLE)
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting gallery from Supabase:', error);
          return false;
        }

        console.log('✅ Gallery deleted from Supabase:', id);
      } else {
        // Fallback to local storage
        const galleries = await this.getLocalGalleries();
        const filtered = galleries.filter(g => g.id !== id);
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      }
      
      // Clean up local cache and auth sessions
      await this.deleteAllPhotos(id);
      this.clearGalleryAuth(id);
      
      return true;
    } catch (error) {
      console.error('Error deleting gallery:', error);
      return false;
    }
  }

  // Gallery Authentication - Keep existing logic
  async authenticateGallery(galleryId: string, password: string): Promise<boolean> {
    try {
      const gallery = await this.getGallery(galleryId);
      if (!gallery) return false;
      
      // If gallery is public and has no password, allow access
      if (gallery.isPublic && !gallery.password) return true;
      
      // Check password
      const isAuthenticated = gallery.password === password;
      
      if (isAuthenticated) {
        // Store auth session
        this.setGalleryAuth(galleryId);
      }
      
      return isAuthenticated;
    } catch (error) {
      console.error('Error authenticating gallery:', error);
      return false;
    }
  }

  isGalleryAuthenticated(galleryId: string): boolean {
    try {
      const authSessions = this.getAuthSessions();
      return authSessions.includes(galleryId);
    } catch (error) {
      return false;
    }
  }

  private setGalleryAuth(galleryId: string): void {
    try {
      const authSessions = this.getAuthSessions();
      if (!authSessions.includes(galleryId)) {
        authSessions.push(galleryId);
        localStorage.setItem(this.AUTH_KEY, JSON.stringify(authSessions));
      }
    } catch (error) {
      console.error('Error setting gallery auth:', error);
    }
  }

  private clearGalleryAuth(galleryId: string): void {
    try {
      const authSessions = this.getAuthSessions();
      const filtered = authSessions.filter(id => id !== galleryId);
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error clearing gallery auth:', error);
    }
  }

  private getAuthSessions(): string[] {
    try {
      const stored = localStorage.getItem(this.AUTH_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  // Rest of the methods remain the same...
  // (Photo management, upload, delete, stats, etc.)

  // Photo Management with Supabase Integration
  async getPhotos(galleryId: string): Promise<Photo[]> {
    try {
      const gallery = await this.getGallery(galleryId);
      if (!gallery) {
        console.error(`Gallery ${galleryId} not found`);
        return [];
      }

      // If Supabase is configured, fetch photos from storage
      if (supabaseService.isReady() && gallery.bucketName && gallery.bucketFolder) {
        console.log(`📂 Fetching photos from Supabase: ${gallery.bucketName}/${gallery.bucketFolder}`);
        return await this.fetchPhotosFromSupabase(gallery);
      }

      // Fallback to cached photos
      const stored = localStorage.getItem(`${this.PHOTOS_KEY}-${galleryId}`);
      if (stored) {
        const photos = JSON.parse(stored);
        return Array.isArray(photos) ? photos : [];
      }

      console.log(`No photos found for gallery ${galleryId}`);
      return [];
      
    } catch (error) {
      console.error('Error loading photos:', error);
      return [];
    }
  }

  private async fetchPhotosFromSupabase(gallery: Gallery): Promise<Photo[]> {
    try {
      if (!gallery.bucketName || !gallery.bucketFolder) {
        return [];
      }

      const files = await supabaseService.listFiles(gallery.bucketName, gallery.bucketFolder);
      
      const photos: Photo[] = files.map(file => {
        const filePath = `${gallery.bucketFolder}/${file.name}`;
        const publicUrl = supabaseService.getPublicUrl(gallery.bucketName!, filePath);
        
        return {
          id: `${gallery.id}-${file.name}`,
          galleryId: gallery.id,
          name: file.name,
          originalName: file.name,
          url: publicUrl || '',
          description: '',
          uploadedAt: file.created_at,
          size: file.metadata?.size || 0,
          mimeType: file.metadata?.mimetype || 'image/jpeg',
          bucketPath: filePath,
          supabaseFile: file
        };
      });

      // Cache photos locally for faster subsequent loads
      localStorage.setItem(`${this.PHOTOS_KEY}-${gallery.id}`, JSON.stringify(photos));
      
      // Update gallery photo count
      await this.updateGallery(gallery.id, { photoCount: photos.length });

      console.log(`✅ Loaded ${photos.length} photos from Supabase`);
      return photos;
      
    } catch (error) {
      console.error('Error fetching photos from Supabase:', error);
      return [];
    }
  }

  // Upload photos to Supabase
  async uploadPhotos(
    galleryId: string, 
    files: File[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ successful: Photo[]; failed: { file: File; error: string }[] }> {
    const gallery = await this.getGallery(galleryId);
    if (!gallery) {
      throw new Error('Gallery not found');
    }

    if (!supabaseService.isReady()) {
      throw new Error('Supabase not configured');
    }

    if (!gallery.bucketName || !gallery.bucketFolder) {
      throw new Error('Gallery bucket configuration missing');
    }

    const successful: Photo[] = [];
    const failed: { file: File; error: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Validate file type
        if (!supabaseService.constructor.isValidImageFile(file)) {
          failed.push({ file, error: 'Invalid image file type' });
          continue;
        }

        // Generate unique filename
        const uniqueName = supabaseService.constructor.generateUniqueFilename(file.name);
        const filePath = `${gallery.bucketFolder}/${uniqueName}`;

        // Upload to Supabase
        const uploadResult = await supabaseService.uploadFile(
          gallery.bucketName,
          filePath,
          file,
          { upsert: false }
        );

        if (uploadResult.success) {
          // Get public URL
          const publicUrl = supabaseService.getPublicUrl(gallery.bucketName, filePath);
          
          if (publicUrl) {
            const photo: Photo = {
              id: `${galleryId}-${uniqueName}`,
              galleryId,
              name: uniqueName,
              originalName: file.name,
              url: publicUrl,
              description: '',
              uploadedAt: new Date().toISOString(),
              size: file.size,
              mimeType: file.type,
              bucketPath: filePath
            };

            successful.push(photo);
          } else {
            failed.push({ file, error: 'Failed to get public URL' });
          }
        } else {
          failed.push({ file, error: uploadResult.error || 'Upload failed' });
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        failed.push({ file, error: 'Upload error' });
      }

      onProgress?.(i + 1, files.length);
    }

    // Update gallery photo count and clear cache
    await this.updateGalleryPhotoCount(galleryId);
    localStorage.removeItem(`${this.PHOTOS_KEY}-${galleryId}`);

    return { successful, failed };
  }

  async deletePhoto(galleryId: string, photoId: string): Promise<boolean> {
    try {
      const gallery = await this.getGallery(galleryId);
      if (!gallery) return false;

      const photos = await this.getPhotos(galleryId);
      const photo = photos.find(p => p.id === photoId);
      
      if (!photo) return false;

      // Delete from Supabase if configured
      if (supabaseService.isReady() && photo.bucketPath && gallery.bucketName) {
        const deleteResult = await supabaseService.deleteFile(gallery.bucketName, photo.bucketPath);
        if (!deleteResult.success) {
          console.error('Failed to delete from Supabase:', deleteResult.error);
          return false;
        }
      }

      // Clear cache to force refresh
      localStorage.removeItem(`${this.PHOTOS_KEY}-${galleryId}`);
      
      // Update gallery photo count
      await this.updateGalleryPhotoCount(galleryId);
      
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  async deleteAllPhotos(galleryId: string): Promise<boolean> {
    try {
      localStorage.removeItem(`${this.PHOTOS_KEY}-${galleryId}`);
      await this.updateGalleryPhotoCount(galleryId);
      return true;
    } catch (error) {
      console.error('Error deleting all photos:', error);
      return false;
    }
  }

  // Bucket Management
  async updateGalleryBucketFolder(galleryId: string, bucketFolder: string): Promise<boolean> {
    try {
      const gallery = await this.updateGallery(galleryId, { bucketFolder });
      
      if (gallery) {
        // Clear photo cache to force refresh from new folder
        localStorage.removeItem(`${this.PHOTOS_KEY}-${galleryId}`);
        
        // Create new folder in Supabase if configured
        if (supabaseService.isReady() && gallery.bucketName) {
          await supabaseService.createFolder(gallery.bucketName, bucketFolder);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating bucket folder:', error);
      return false;
    }
  }

  // Utility methods
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private async updateGalleryPhotoCount(galleryId: string): Promise<void> {
    try {
      const photos = await this.getPhotos(galleryId);
      await this.updateGallery(galleryId, { photoCount: photos.length });
    } catch (error) {
      console.error('Error updating photo count:', error);
    }
  }

  // Statistics
  async getGalleryStats(galleryId: string): Promise<{
    photoCount: number;
    totalSize: number;
    lastUpdated: string;
    bucketFolder: string;
    bucketName: string;
    isPasswordProtected: boolean;
  }> {
    try {
      const photos = await this.getPhotos(galleryId);
      const gallery = await this.getGallery(galleryId);
      
      return {
        photoCount: photos.length,
        totalSize: photos.reduce((sum, photo) => sum + photo.size, 0),
        lastUpdated: gallery?.updatedAt || new Date().toISOString(),
        bucketFolder: gallery?.bucketFolder || 'unknown',
        bucketName: gallery?.bucketName || this.DEFAULT_BUCKET,
        isPasswordProtected: !!(gallery?.password)
      };
    } catch (error) {
      console.error('Error getting gallery stats:', error);
      return {
        photoCount: 0,
        totalSize: 0,
        lastUpdated: new Date().toISOString(),
        bucketFolder: 'unknown',
        bucketName: this.DEFAULT_BUCKET,
        isPasswordProtected: false
      };
    }
  }

  // Search and filter
  async searchPhotos(galleryId: string, query: string): Promise<Photo[]> {
    try {
      const photos = await this.getPhotos(galleryId);
      const lowercaseQuery = query.toLowerCase();
      
      return photos.filter(photo => 
        photo.name.toLowerCase().includes(lowercaseQuery) ||
        photo.description?.toLowerCase().includes(lowercaseQuery) ||
        photo.originalName.toLowerCase().includes(lowercaseQuery)
      );
    } catch (error) {
      console.error('Error searching photos:', error);
      return [];
    }
  }

  // Validation
  validateBucketFolder(folder: string): { isValid: boolean; error?: string } {
    if (!folder || folder.trim().length === 0) {
      return { isValid: false, error: 'Bucket folder cannot be empty' };
    }

    // Check for valid characters (alphanumeric, hyphens, underscores, forward slashes)
    const validPattern = /^[a-zA-Z0-9/_-]+$/;
    if (!validPattern.test(folder)) {
      return { isValid: false, error: 'Bucket folder can only contain letters, numbers, hyphens, underscores, and forward slashes' };
    }

    // Check length
    if (folder.length > 100) {
      return { isValid: false, error: 'Bucket folder path is too long (max 100 characters)' };
    }

    // Check for invalid patterns
    if (folder.startsWith('/') || folder.endsWith('/')) {
      return { isValid: false, error: 'Bucket folder cannot start or end with a forward slash' };
    }

    if (folder.includes('//')) {
      return { isValid: false, error: 'Bucket folder cannot contain consecutive forward slashes' };
    }

    return { isValid: true };
  }

  // Supabase connection management (simplified - always configured now)
  async testSupabaseConnection(): Promise<boolean> {
    return await supabaseService.testConnection();
  }

  isSupabaseConfigured(): boolean {
    return supabaseService.isReady();
  }

  // Manual sync methods for admin panel
  async syncFromSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      if (!supabaseService.isReady()) {
        return { success: false, count: 0, error: 'Supabase not configured' };
      }

      await this.ensureTableExists();
      const galleries = await this.getGalleries();
      
      return { 
        success: true, 
        count: galleries.length 
      };
    } catch (error) {
      console.error('Error syncing from Supabase:', error);
      return { 
        success: false, 
        count: 0, 
        error: error instanceof Error ? error.message : 'Sync failed' 
      };
    }
  }

  async getConnectionStatus(): Promise<{
    isConnected: boolean;
    isTableReady: boolean;
    localGalleries: number;
    remoteGalleries: number;
  }> {
    try {
      const isConnected = supabaseService.isReady();
      let isTableReady = false;
      let remoteGalleries = 0;

      if (isConnected) {
        try {
          const { data, error } = await supabaseService.client
            .from(this.GALLERIES_TABLE)
            .select('id', { count: 'exact' });
          
          isTableReady = !error;
          remoteGalleries = data?.length || 0;
        } catch (error) {
          isTableReady = false;
        }
      }

      const localGalleries = (await this.getLocalGalleries()).length;

      return {
        isConnected,
        isTableReady,
        localGalleries,
        remoteGalleries
      };
    } catch (error) {
      return {
        isConnected: false,
        isTableReady: false,
        localGalleries: 0,
        remoteGalleries: 0
      };
    }
  }
}

export const galleryService = new GalleryService();