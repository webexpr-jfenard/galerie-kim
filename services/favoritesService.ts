import { supabaseService } from './supabaseService';

export interface FavoritePhoto {
  id: string;
  galleryId: string;
  photoId: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  galleryId: string;
  photoId: string;
  deviceId: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

class FavoritesService {
  private readonly LOCAL_FAVORITES_KEY = 'gallery-favorites';
  private readonly LOCAL_COMMENTS_KEY = 'gallery-comments';
  private readonly DEVICE_ID_KEY = 'gallery-device-id';
  private readonly FAVORITES_TABLE = 'favorites';
  private readonly COMMENTS_TABLE = 'comments';
  
  private deviceId: string;
  private migrationComplete = false;

  constructor() {
    // Generate or retrieve device ID for multi-device sync
    this.deviceId = this.getOrCreateDeviceId();
    console.log('📱 Device ID:', this.deviceId);
  }

  private getOrCreateDeviceId(): string {
    try {
      let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
      if (!deviceId) {
        // Generate unique device ID
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error managing device ID:', error);
      return `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
  }

  // Migrate local data to Supabase (one-time operation)
  private async migrateLocalData(): Promise<void> {
    if (this.migrationComplete || !supabaseService.isReady()) {
      return;
    }

    try {
      console.log('🔄 Migrating local favorites and comments to Supabase...');
      
      // Migrate favorites
      const localFavorites = localStorage.getItem(this.LOCAL_FAVORITES_KEY);
      if (localFavorites) {
        try {
          const favoritesData = JSON.parse(localFavorites);
          const migrationPromises = [];
          
          for (const [galleryId, photoIds] of Object.entries(favoritesData)) {
            if (Array.isArray(photoIds)) {
              for (const photoId of photoIds) {
                migrationPromises.push(this.addToFavoritesSupabase(galleryId, photoId as string));
              }
            }
          }
          
          await Promise.allSettled(migrationPromises);
          console.log('✅ Migrated favorites to Supabase');
        } catch (error) {
          console.warn('⚠️ Error migrating favorites:', error);
        }
      }

      // Migrate comments
      const localComments = localStorage.getItem(this.LOCAL_COMMENTS_KEY);
      if (localComments) {
        try {
          const commentsData = JSON.parse(localComments);
          const migrationPromises = [];
          
          for (const [galleryId, galleryComments] of Object.entries(commentsData)) {
            if (Array.isArray(galleryComments)) {
              for (const comment of galleryComments as any[]) {
                if (comment.photoId && comment.comment) {
                  migrationPromises.push(this.addCommentSupabase(galleryId, comment.photoId, comment.comment));
                }
              }
            }
          }
          
          await Promise.allSettled(migrationPromises);
          console.log('✅ Migrated comments to Supabase');
        } catch (error) {
          console.warn('⚠️ Error migrating comments:', error);
        }
      }

      // Backup and clear local data after successful migration
      if (localFavorites) {
        localStorage.setItem(`${this.LOCAL_FAVORITES_KEY}-backup`, localFavorites);
        localStorage.removeItem(this.LOCAL_FAVORITES_KEY);
      }
      if (localComments) {
        localStorage.setItem(`${this.LOCAL_COMMENTS_KEY}-backup`, localComments);
        localStorage.removeItem(this.LOCAL_COMMENTS_KEY);
      }

      this.migrationComplete = true;
      console.log('🎉 Local data migration completed');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      // Don't mark as complete so it can be retried
    }
  }

  // FAVORITES MANAGEMENT - SIMPLIFIED (NO DEVICE DISTINCTION)

  async getFavorites(galleryId: string): Promise<FavoritePhoto[]> {
    try {
      if (supabaseService.isReady()) {
        await this.migrateLocalData();
        return await this.getFavoritesFromSupabase(galleryId);
      } else {
        return this.getFavoritesFromLocal(galleryId);
      }
    } catch (error) {
      console.error('Error getting favorites:', error);
      // Fallback to local storage
      return this.getFavoritesFromLocal(galleryId);
    }
  }

  private async getFavoritesFromSupabase(galleryId: string): Promise<FavoritePhoto[]> {
    try {
      console.log(`📂 Fetching ALL favorites for gallery ${galleryId} from Supabase (shared selection)...`);
      
      // Get all favorites for this gallery (no device filtering)
      const { data, error } = await supabaseService.client
        .from(this.FAVORITES_TABLE)
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorites from Supabase:', error);
        return this.getFavoritesFromLocal(galleryId);
      }

      // Group by photo_id to get unique favorites (in case multiple devices added same photo)
      const uniqueFavorites = new Map<string, FavoritePhoto>();
      (data || []).forEach(row => {
        const photoId = row.photo_id;
        if (!uniqueFavorites.has(photoId)) {
          uniqueFavorites.set(photoId, {
            id: row.id,
            galleryId: row.gallery_id,
            photoId: row.photo_id,
            deviceId: row.device_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          });
        }
      });

      const favorites = Array.from(uniqueFavorites.values());
      console.log(`✅ Loaded ${favorites.length} unique favorites from Supabase (shared selection)`);
      return favorites;
      
    } catch (error) {
      console.error('Error fetching favorites from Supabase:', error);
      return this.getFavoritesFromLocal(galleryId);
    }
  }

  private getFavoritesFromLocal(galleryId: string): FavoritePhoto[] {
    try {
      const stored = localStorage.getItem(this.LOCAL_FAVORITES_KEY);
      if (!stored) return [];
      
      const allFavorites = JSON.parse(stored);
      const galleryFavorites = allFavorites[galleryId] || [];
      
      // Convert old format to new format
      return galleryFavorites.map((photoId: string, index: number) => ({
        id: `local_${galleryId}_${photoId}_${index}`,
        galleryId,
        photoId,
        deviceId: this.deviceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error loading local favorites:', error);
      return [];
    }
  }

  async addToFavorites(galleryId: string, photoId: string): Promise<FavoritePhoto> {
    try {
      if (supabaseService.isReady()) {
        return await this.addToFavoritesSupabase(galleryId, photoId);
      } else {
        return this.addToFavoritesLocal(galleryId, photoId);
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
      // Fallback to local storage
      return this.addToFavoritesLocal(galleryId, photoId);
    }
  }

  private async addToFavoritesSupabase(galleryId: string, photoId: string): Promise<FavoritePhoto> {
    console.log(`❤️ Adding photo ${photoId} to shared favorites in Supabase...`);
    
    // Check if already exists (to prevent duplicates from different devices)
    const { data: existing } = await supabaseService.client
      .from(this.FAVORITES_TABLE)
      .select('id')
      .eq('gallery_id', galleryId)
      .eq('photo_id', photoId)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('Photo already in favorites, returning existing');
      // Return existing favorite
      const { data: existingFav } = await supabaseService.client
        .from(this.FAVORITES_TABLE)
        .select('*')
        .eq('id', existing[0].id)
        .single();
      
      if (existingFav) {
        return {
          id: existingFav.id,
          galleryId: existingFav.gallery_id,
          photoId: existingFav.photo_id,
          deviceId: existingFav.device_id,
          createdAt: existingFav.created_at,
          updatedAt: existingFav.updated_at
        };
      }
    }

    // Add new favorite
    const { data, error } = await supabaseService.client
      .from(this.FAVORITES_TABLE)
      .insert([{
        gallery_id: galleryId,
        photo_id: photoId,
        device_id: this.deviceId
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding to favorites in Supabase:', error);
      throw error;
    }

    const favorite: FavoritePhoto = {
      id: data.id,
      galleryId: data.gallery_id,
      photoId: data.photo_id,
      deviceId: data.device_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    console.log('✅ Added to shared favorites in Supabase');
    return favorite;
  }

  private addToFavoritesLocal(galleryId: string, photoId: string): FavoritePhoto {
    try {
      const stored = localStorage.getItem(this.LOCAL_FAVORITES_KEY);
      const allFavorites = stored ? JSON.parse(stored) : {};
      
      if (!allFavorites[galleryId]) {
        allFavorites[galleryId] = [];
      }
      
      if (!allFavorites[galleryId].includes(photoId)) {
        allFavorites[galleryId].push(photoId);
        localStorage.setItem(this.LOCAL_FAVORITES_KEY, JSON.stringify(allFavorites));
      }

      return {
        id: `local_${galleryId}_${photoId}_${Date.now()}`,
        galleryId,
        photoId,
        deviceId: this.deviceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error adding to local favorites:', error);
      throw error;
    }
  }

  async removeFromFavorites(galleryId: string, photoId: string): Promise<boolean> {
    try {
      if (supabaseService.isReady()) {
        return await this.removeFromFavoritesSupabase(galleryId, photoId);
      } else {
        return this.removeFromFavoritesLocal(galleryId, photoId);
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      // Fallback to local storage
      return this.removeFromFavoritesLocal(galleryId, photoId);
    }
  }

  private async removeFromFavoritesSupabase(galleryId: string, photoId: string): Promise<boolean> {
    console.log(`💔 Removing photo ${photoId} from shared favorites in Supabase...`);
    
    // Remove ALL instances of this photo from favorites (from any device)
    const { error } = await supabaseService.client
      .from(this.FAVORITES_TABLE)
      .delete()
      .eq('gallery_id', galleryId)
      .eq('photo_id', photoId);

    if (error) {
      console.error('Error removing from favorites in Supabase:', error);
      return false;
    }

    console.log('✅ Removed from shared favorites in Supabase');
    return true;
  }

  private removeFromFavoritesLocal(galleryId: string, photoId: string): boolean {
    try {
      const stored = localStorage.getItem(this.LOCAL_FAVORITES_KEY);
      if (!stored) return false;
      
      const allFavorites = JSON.parse(stored);
      if (!allFavorites[galleryId]) return false;
      
      const index = allFavorites[galleryId].indexOf(photoId);
      if (index > -1) {
        allFavorites[galleryId].splice(index, 1);
        localStorage.setItem(this.LOCAL_FAVORITES_KEY, JSON.stringify(allFavorites));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error removing from local favorites:', error);
      return false;
    }
  }

  // COMMENTS MANAGEMENT

  async getComments(galleryId: string): Promise<Comment[]> {
    try {
      if (supabaseService.isReady()) {
        await this.migrateLocalData();
        return await this.getCommentsFromSupabase(galleryId);
      } else {
        return this.getCommentsFromLocal(galleryId);
      }
    } catch (error) {
      console.error('Error getting comments:', error);
      // Fallback to local storage
      return this.getCommentsFromLocal(galleryId);
    }
  }

  private async getCommentsFromSupabase(galleryId: string): Promise<Comment[]> {
    try {
      console.log(`💬 Fetching comments for gallery ${galleryId} from Supabase...`);
      
      const { data, error } = await supabaseService.client
        .from(this.COMMENTS_TABLE)
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments from Supabase:', error);
        return this.getCommentsFromLocal(galleryId);
      }

      const comments: Comment[] = (data || []).map(row => ({
        id: row.id,
        galleryId: row.gallery_id,
        photoId: row.photo_id,
        deviceId: row.device_id,
        comment: row.comment,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      console.log(`✅ Loaded ${comments.length} comments from Supabase`);
      return comments;
      
    } catch (error) {
      console.error('Error fetching comments from Supabase:', error);
      return this.getCommentsFromLocal(galleryId);
    }
  }

  private getCommentsFromLocal(galleryId: string): Comment[] {
    try {
      const stored = localStorage.getItem(this.LOCAL_COMMENTS_KEY);
      if (!stored) return [];
      
      const allComments = JSON.parse(stored);
      const galleryComments = allComments[galleryId] || [];
      
      // Convert old format to new format
      return galleryComments.map((comment: any, index: number) => ({
        id: comment.id || `local_${galleryId}_${comment.photoId}_${index}`,
        galleryId,
        photoId: comment.photoId,
        deviceId: this.deviceId,
        comment: comment.comment,
        createdAt: comment.createdAt || new Date().toISOString(),
        updatedAt: comment.updatedAt || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error loading local comments:', error);
      return [];
    }
  }

  async addComment(galleryId: string, photoId: string, comment: string): Promise<Comment> {
    try {
      if (supabaseService.isReady()) {
        return await this.addCommentSupabase(galleryId, photoId, comment);
      } else {
        return this.addCommentLocal(galleryId, photoId, comment);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Fallback to local storage
      return this.addCommentLocal(galleryId, photoId, comment);
    }
  }

  private async addCommentSupabase(galleryId: string, photoId: string, comment: string): Promise<Comment> {
    console.log(`💬 Adding comment for photo ${photoId} in Supabase...`);
    
    const { data, error } = await supabaseService.client
      .from(this.COMMENTS_TABLE)
      .insert([{
        gallery_id: galleryId,
        photo_id: photoId,
        device_id: this.deviceId,
        comment: comment
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding comment in Supabase:', error);
      throw error;
    }

    const newComment: Comment = {
      id: data.id,
      galleryId: data.gallery_id,
      photoId: data.photo_id,
      deviceId: data.device_id,
      comment: data.comment,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    console.log('✅ Added comment in Supabase');
    return newComment;
  }

  private addCommentLocal(galleryId: string, photoId: string, comment: string): Comment {
    try {
      const stored = localStorage.getItem(this.LOCAL_COMMENTS_KEY);
      const allComments = stored ? JSON.parse(stored) : {};
      
      if (!allComments[galleryId]) {
        allComments[galleryId] = [];
      }
      
      const newComment = {
        id: `local_${galleryId}_${photoId}_${Date.now()}`,
        galleryId,
        photoId,
        deviceId: this.deviceId,
        comment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      allComments[galleryId].push(newComment);
      localStorage.setItem(this.LOCAL_COMMENTS_KEY, JSON.stringify(allComments));
      
      return newComment;
    } catch (error) {
      console.error('Error adding local comment:', error);
      throw error;
    }
  }

  async removeComment(commentId: string): Promise<boolean> {
    try {
      if (supabaseService.isReady()) {
        return await this.removeCommentSupabase(commentId);
      } else {
        return this.removeCommentLocal(commentId);
      }
    } catch (error) {
      console.error('Error removing comment:', error);
      return false;
    }
  }

  private async removeCommentSupabase(commentId: string): Promise<boolean> {
    console.log(`🗑️ Removing comment ${commentId} from Supabase...`);
    
    const { error } = await supabaseService.client
      .from(this.COMMENTS_TABLE)
      .delete()
      .eq('id', commentId)
      .eq('device_id', this.deviceId); // Only allow deleting own comments

    if (error) {
      console.error('Error removing comment from Supabase:', error);
      return false;
    }

    console.log('✅ Removed comment from Supabase');
    return true;
  }

  private removeCommentLocal(commentId: string): boolean {
    try {
      const stored = localStorage.getItem(this.LOCAL_COMMENTS_KEY);
      if (!stored) return false;
      
      const allComments = JSON.parse(stored);
      let found = false;
      
      for (const galleryId in allComments) {
        const galleryComments = allComments[galleryId];
        const index = galleryComments.findIndex((c: any) => c.id === commentId);
        if (index > -1) {
          galleryComments.splice(index, 1);
          found = true;
          break;
        }
      }
      
      if (found) {
        localStorage.setItem(this.LOCAL_COMMENTS_KEY, JSON.stringify(allComments));
      }
      
      return found;
    } catch (error) {
      console.error('Error removing local comment:', error);
      return false;
    }
  }

  // UTILITY METHODS

  async getPhotoComments(galleryId: string, photoId: string): Promise<Comment[]> {
    try {
      const allComments = await this.getComments(galleryId);
      return allComments.filter(comment => comment.photoId === photoId);
    } catch (error) {
      console.error('Error getting photo comments:', error);
      return [];
    }
  }

  async isPhotoFavorited(galleryId: string, photoId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites(galleryId);
      return favorites.some(fav => fav.photoId === photoId);
    } catch (error) {
      console.error('Error checking if photo is favorited:', error);
      return false;
    }
  }

  async getDeviceId(): Promise<string> {
    return this.deviceId;
  }

  // Statistics
  async getFavoritesCount(galleryId: string): Promise<number> {
    try {
      const favorites = await this.getFavorites(galleryId);
      return favorites.length;
    } catch (error) {
      console.error('Error getting favorites count:', error);
      return 0;
    }
  }

  async getCommentsCount(galleryId: string): Promise<number> {
    try {
      const comments = await this.getComments(galleryId);
      return comments.length;
    } catch (error) {
      console.error('Error getting comments count:', error);
      return 0;
    }
  }

  async getPhotoCommentsCount(galleryId: string, photoId: string): Promise<number> {
    try {
      const comments = await this.getPhotoComments(galleryId, photoId);
      return comments.length;
    } catch (error) {
      console.error('Error getting photo comments count:', error);
      return 0;
    }
  }

  // Clear data (for testing/admin purposes)
  async clearAllFavorites(galleryId: string): Promise<boolean> {
    try {
      if (supabaseService.isReady()) {
        const { error } = await supabaseService.client
          .from(this.FAVORITES_TABLE)
          .delete()
          .eq('gallery_id', galleryId);

        if (error) {
          console.error('Error clearing favorites from Supabase:', error);
          return false;
        }
      }
      
      // Also clear local storage
      const stored = localStorage.getItem(this.LOCAL_FAVORITES_KEY);
      if (stored) {
        const allFavorites = JSON.parse(stored);
        delete allFavorites[galleryId];
        localStorage.setItem(this.LOCAL_FAVORITES_KEY, JSON.stringify(allFavorites));
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing all favorites:', error);
      return false;
    }
  }

  async clearAllComments(galleryId: string): Promise<boolean> {
    try {
      if (supabaseService.isReady()) {
        const { error } = await supabaseService.client
          .from(this.COMMENTS_TABLE)
          .delete()
          .eq('gallery_id', galleryId);

        if (error) {
          console.error('Error clearing comments from Supabase:', error);
          return false;
        }
      }
      
      // Also clear local storage
      const stored = localStorage.getItem(this.LOCAL_COMMENTS_KEY);
      if (stored) {
        const allComments = JSON.parse(stored);
        delete allComments[galleryId];
        localStorage.setItem(this.LOCAL_COMMENTS_KEY, JSON.stringify(allComments));
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing all comments:', error);
      return false;
    }
  }
}

export const favoritesService = new FavoritesService();