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
  subfolder?: string; // NEW: Subfolder for organization
}

export interface SubfolderInfo {
  name: string;
  photoCount: number;
  lastUpdated: string;
}

class GalleryService {
  private readonly LOCAL_STORAGE_KEY = 'photo-galleries'; // For migration only
  private readonly PHOTOS_KEY = 'gallery-photos';
  private readonly AUTH_KEY = 'gallery-auth-sessions';
  private readonly DEFAULT_BUCKET = 'photos'; // Default Supabase bucket name
  private readonly GALLERIES_TABLE = 'galleries'; // Supabase table name
  private readonly PHOTOS_TABLE = 'photos'; // Supabase photos table
  
  private migrationComplete = false;

  // Check if database tables exist and are accessible
  private async checkDatabaseHealth(): Promise<{ tablesExist: boolean; functionsExist: boolean }> {
    if (!supabaseService.isReady()) {
      return { tablesExist: false, functionsExist: false };
    }

    try {
      // Test galleries table
      const { error: galleriesError } = await supabaseService.client
        .from(this.GALLERIES_TABLE)
        .select('id')
        .limit(1);

      // Test photos table
      const { error: photosError } = await supabaseService.client
        .from(this.PHOTOS_TABLE)
        .select('id')
        .limit(1);

      // Test function
      const { error: functionError } = await supabaseService.client
        .rpc('get_gallery_subfolders', { gallery_id_param: 'test' });

      const tablesExist = !galleriesError && !photosError;
      const functionsExist = !functionError || functionError.code !== 'PGRST202';

      console.log('Database health check:', { 
        tablesExist, 
        functionsExist,
        galleriesError: galleriesError?.code,
        photosError: photosError?.code,
        functionError: functionError?.code
      });

      return { tablesExist, functionsExist };
    } catch (error) {
      console.error('Database health check failed:', error);
      return { tablesExist: false, functionsExist: false };
    }
  }

  // Initialize and ensure table exists
  private async ensureTableExists(): Promise<void> {
    if (!supabaseService.isReady()) {
      console.warn('⚠️ Supabase not ready - this should not happen with hardcoded config');
      return;
    }

    try {
      const health = await this.checkDatabaseHealth();
      
      if (!health.tablesExist) {
        console.warn('⚠️ Database tables do not exist. Please run the SQL setup script.');
        console.log('📝 Execute the SUPABASE_FOLDERS_UPDATE.sql file in your Supabase SQL Editor.');
      }
      
      if (!health.functionsExist) {
        console.warn('⚠️ Database functions do not exist. Please run the SQL setup script.');
      }
    } catch (error) {
      console.error('❌ Error checking database health:', error);
    }
  }

  // Migrate local galleries to Supabase (one-time operation)
  private async migrateLocalGalleries(): Promise<void> {
    if (this.migrationComplete || !supabaseService.isReady()) {
      return;
    }

    try {
      const health = await this.checkDatabaseHealth();
      if (!health.tablesExist) {
        console.warn('Cannot migrate - database tables not ready');
        return;
      }

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
      
      const health = await this.checkDatabaseHealth();
      if (!health.tablesExist) {
        console.warn('⚠️ Database not ready, falling back to local storage');
        return this.getLocalGalleries();
      }

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
      
      const health = await this.checkDatabaseHealth();
      if (!health.tablesExist) {
        console.warn('⚠️ Database not ready, checking local storage');
        const galleries = await this.getLocalGalleries();
        const found = galleries.find(g => g.id === id) || null;
        console.log(found ? `✅ Found gallery locally: ${found.name}` : `❌ Gallery ${id} not found locally`);
        return found;
      }

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
      
      const health = await this.checkDatabaseHealth();
      if (!health.tablesExist) {
        return { success: false, count: 0, error: 'Database tables not ready. Please run SQL setup.' };
      }
      
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
        
        const health = await this.checkDatabaseHealth();
        if (!health.tablesExist) {
          throw new Error('Database tables not ready. Please run the SQL setup script.');
        }

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
      throw new Error(`Failed to create gallery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateGallery(id: string, updates: Partial<Gallery>): Promise<Gallery | null> {
    try {
      const updatedAt = new Date().toISOString();
      
      if (supabaseService.isReady()) {
        await this.ensureTableExists();
        
        const health = await this.checkDatabaseHealth();
        if (!health.tablesExist) {
          console.warn('Database not ready, falling back to local storage');
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
        const health = await this.checkDatabaseHealth();
        if (health.tablesExist) {
          // Delete from Supabase database first (cascade will handle photos)
          const { error } = await supabaseService.client
            .from(this.GALLERIES_TABLE)
            .delete()
            .eq('id', id);

          if (error) {
            console.error('Error deleting gallery from Supabase:', error);
            return false;
          }

          console.log('✅ Gallery deleted from Supabase:', id);
        }

        // Delete photos from Supabase storage
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

  // NEW: Subfolder Management with better error handling
  async getGallerySubfolders(galleryId: string): Promise<SubfolderInfo[]> {
    try {
      if (!supabaseService.isReady()) {
        // Local fallback - scan photos in local storage
        const photos = await this.getPhotos(galleryId);
        const subfolderMap = new Map<string, SubfolderInfo>();
        
        photos.forEach(photo => {
          if (photo.subfolder) {
            const existing = subfolderMap.get(photo.subfolder);
            if (existing) {
              existing.photoCount++;
              if (photo.uploadedAt > existing.lastUpdated) {
                existing.lastUpdated = photo.uploadedAt;
              }
            } else {
              subfolderMap.set(photo.subfolder, {
                name: photo.subfolder,
                photoCount: 1,
                lastUpdated: photo.uploadedAt
              });
            }
          }
        });
        
        return Array.from(subfolderMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      }

      const health = await this.checkDatabaseHealth();
      if (!health.functionsExist) {
        console.warn('Database function get_gallery_subfolders not available, using fallback');
        // Fallback to manual query if function doesn't exist
        return await this.getSubfoldersFallback(galleryId);
      }

      // Use Supabase function if available
      const { data, error } = await supabaseService.client
        .rpc('get_gallery_subfolders', { gallery_id_param: galleryId });

      if (error) {
        console.error('Error fetching subfolders:', error);
        // Use fallback method
        return await this.getSubfoldersFallback(galleryId);
      }

      return (data || []).map((row: any) => ({
        name: row.subfolder,
        photoCount: parseInt(row.photo_count),
        lastUpdated: new Date().toISOString() // Fallback date
      }));
      
    } catch (error) {
      console.error('Error getting gallery subfolders:', error);
      return [];
    }
  }

  // Fallback method to get subfolders without using the SQL function
  private async getSubfoldersFallback(galleryId: string): Promise<SubfolderInfo[]> {
    try {
      if (!supabaseService.isReady()) {
        return [];
      }

      const health = await this.checkDatabaseHealth();
      if (!health.tablesExist) {
        return [];
      }

      // Manual query to group by subfolder
      const { data, error } = await supabaseService.client
        .from(this.PHOTOS_TABLE)
        .select('subfolder')
        .eq('gallery_id', galleryId)
        .not('subfolder', 'is', null)
        .not('subfolder', 'eq', '');

      if (error) {
        console.error('Error in subfolder fallback query:', error);
        return [];
      }

      // Count manually since we can't use SQL aggregation
      const subfolderCounts = new Map<string, number>();
      (data || []).forEach(row => {
        if (row.subfolder) {
          subfolderCounts.set(row.subfolder, (subfolderCounts.get(row.subfolder) || 0) + 1);
        }
      });

      return Array.from(subfolderCounts.entries()).map(([name, count]) => ({
        name,
        photoCount: count,
        lastUpdated: new Date().toISOString()
      })).sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
      console.error('Error in subfolder fallback:', error);
      return [];
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

  // Photo Management with Supabase Integration
  async getPhotos(galleryId: string, subfolder?: string): Promise<Photo[]> {
    try {
      const gallery = await this.getGallery(galleryId);
      if (!gallery) {
        console.error(`Gallery ${galleryId} not found`);
        return [];
      }

      // If Supabase is configured, fetch photos from database
      if (supabaseService.isReady()) {
        const health = await this.checkDatabaseHealth();
        if (health.tablesExist) {
          console.log(`📂 Fetching photos from Supabase database for gallery: ${galleryId}${subfolder ? `, subfolder: ${subfolder}` : ''}`);
          return await this.fetchPhotosFromSupabaseDB(galleryId, subfolder);
        } else {
          console.warn('Database not ready, using fallback method');
          return await this.fetchPhotosFromSupabase(gallery);
        }
      }

      // Fallback to cached photos
      const stored = localStorage.getItem(`${this.PHOTOS_KEY}-${galleryId}`);
      if (stored) {
        const photos = JSON.parse(stored);
        let filteredPhotos = Array.isArray(photos) ? photos : [];
        
        // Filter by subfolder if specified
        if (subfolder) {
          filteredPhotos = filteredPhotos.filter((photo: Photo) => photo.subfolder === subfolder);
        }
        
        return filteredPhotos;
      }

      console.log(`No photos found for gallery ${galleryId}`);
      return [];
      
    } catch (error) {
      console.error('Error loading photos:', error);
      return [];
    }
  }

  // NEW: Fetch photos from Supabase database (with subfolder support)
  private async fetchPhotosFromSupabaseDB(galleryId: string, subfolder?: string): Promise<Photo[]> {
    try {
      let query = supabaseService.client
        .from(this.PHOTOS_TABLE)
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      // Filter by subfolder if specified
      if (subfolder) {
        query = query.eq('subfolder', subfolder);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching photos from database:', error);
        return [];
      }

      const photos: Photo[] = (data || []).map(row => ({
        id: row.id,
        galleryId: row.gallery_id,
        name: row.name,
        originalName: row.name, // Assuming name is the original name
        url: row.url,
        description: row.description || '',
        uploadedAt: row.created_at,
        size: row.file_size || 0,
        mimeType: row.file_type || 'image/jpeg',
        bucketPath: `${galleryId}/${row.subfolder ? `${row.subfolder}/` : ''}${row.name}`,
        subfolder: row.subfolder || undefined
      }));

      console.log(`✅ Loaded ${photos.length} photos from Supabase database`);
      return photos;
      
    } catch (error) {
      console.error('Error fetching photos from Supabase database:', error);
      return [];
    }
  }

  // Legacy method for backward compatibility
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

  // Upload photos to Supabase WITH SUBFOLDER SUPPORT
  async uploadPhotos(
    galleryId: string, 
    files: File[],
    options?: {
      subfolder?: string;
      onProgress?: (completed: number, total: number) => void;
    }
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
    const subfolder = options?.subfolder?.trim() || undefined;

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
        
        // Build file path with subfolder support
        const subfolderPath = subfolder ? `${subfolder}/` : '';
        const filePath = `${gallery.bucketFolder}/${subfolderPath}${uniqueName}`;

        // Upload to Supabase Storage
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
              bucketPath: filePath,
              subfolder: subfolder
            };

            // Try to insert photo record into database if tables exist
            const health = await this.checkDatabaseHealth();
            if (health.tablesExist) {
              try {
                const photoRecord = {
                  gallery_id: galleryId,
                  name: uniqueName,
                  url: publicUrl,
                  description: null,
                  subfolder: subfolder || null,
                  file_size: file.size,
                  file_type: file.type
                };

                const { data: insertedPhoto, error: insertError } = await supabaseService.client
                  .from(this.PHOTOS_TABLE)
                  .insert([photoRecord])
                  .select()
                  .single();

                if (insertedPhoto) {
                  photo.id = insertedPhoto.id;
                }

                if (insertError) {
                  console.warn('Error inserting photo record:', insertError);
                  // Continue anyway since file was uploaded successfully
                }
              } catch (dbError) {
                console.warn('Database insertion failed, continuing with file upload:', dbError);
              }
            }

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

      options?.onProgress?.(i + 1, files.length);
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

      if (supabaseService.isReady()) {
        const health = await this.checkDatabaseHealth();
        if (health.tablesExist) {
          // Delete from Supabase database first
          const { error: dbError } = await supabaseService.client
            .from(this.PHOTOS_TABLE)
            .delete()
            .eq('id', photoId);

          if (dbError) {
            console.error('Error deleting photo from database:', dbError);
          }
        }

        // Delete from Supabase storage
        if (photo.bucketPath && gallery.bucketName) {
          const deleteResult = await supabaseService.deleteFile(gallery.bucketName, photo.bucketPath);
          if (!deleteResult.success) {
            console.warn('Could not delete file from storage:', deleteResult.error);
          }
        }
      }

      // Update gallery photo count and clear cache
      await this.updateGalleryPhotoCount(galleryId);
      localStorage.removeItem(`${this.PHOTOS_KEY}-${galleryId}`);

      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  async deleteAllPhotos(galleryId: string): Promise<boolean> {
    try {
      const gallery = await this.getGallery(galleryId);
      if (!gallery) return false;

      if (supabaseService.isReady()) {
        const health = await this.checkDatabaseHealth();
        if (health.tablesExist) {
          // Delete all photos from database
          const { error: dbError } = await supabaseService.client
            .from(this.PHOTOS_TABLE)
            .delete()
            .eq('gallery_id', galleryId);

          if (dbError) {
            console.error('Error deleting photos from database:', dbError);
          }
        }

        // Delete from Supabase storage
        if (gallery.bucketName && gallery.bucketFolder) {
          try {
            const files = await supabaseService.listFiles(gallery.bucketName, gallery.bucketFolder);
            for (const file of files) {
              const filePath = `${gallery.bucketFolder}/${file.name}`;
              const deleteResult = await supabaseService.deleteFile(gallery.bucketName, filePath);
              if (!deleteResult.success) {
                console.warn('Could not delete file:', filePath, deleteResult.error);
              }
            }
          } catch (error) {
            console.warn('Could not list/delete files from storage:', error);
          }
        }
      }

      // Clear local cache
      localStorage.removeItem(`${this.PHOTOS_KEY}-${galleryId}`);

      // Update gallery photo count
      await this.updateGallery(galleryId, { photoCount: 0 });

      return true;
    } catch (error) {
      console.error('Error deleting all photos:', error);
      return false;
    }
  }

  // Utility methods
  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  private async updateGalleryPhotoCount(galleryId: string): Promise<void> {
    try {
      const photos = await this.getPhotos(galleryId);
      await this.updateGallery(galleryId, { photoCount: photos.length });
    } catch (error) {
      console.error('Error updating gallery photo count:', error);
    }
  }

  // Check if Supabase is configured
  isSupabaseConfigured(): boolean {
    return supabaseService.isReady();
  }

  // Get gallery statistics
  async getGalleryStats(galleryId: string): Promise<{
    photoCount: number;
    totalSize: number;
    subfolders: SubfolderInfo[];
    lastUpload?: string;
  }> {
    try {
      const photos = await this.getPhotos(galleryId);
      const subfolders = await this.getGallerySubfolders(galleryId);
      
      const totalSize = photos.reduce((sum, photo) => sum + photo.size, 0);
      const lastUpload = photos.length > 0 
        ? photos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0].uploadedAt
        : undefined;

      return {
        photoCount: photos.length,
        totalSize,
        subfolders,
        lastUpload
      };
    } catch (error) {
      console.error('Error getting gallery stats:', error);
      return {
        photoCount: 0,
        totalSize: 0,
        subfolders: [],
        lastUpload: undefined
      };
    }
  }
}

export const galleryService = new GalleryService();