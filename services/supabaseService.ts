import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase configuration
const SUPABASE_URL = "https://ugfkyfmthbwqoeauyqlz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZmt5Zm10aGJ3cW9lYXV5cWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjU0MzksImV4cCI6MjA2NTI0MTQzOX0.0hr_vXm8xjkGytwbY0mR6OPs_9SR6hmiv8ucNSaRJ0U";

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string;
    contentLength: number;
    httpStatusCode: number;
  };
}

class SupabaseService {
  public client: any; // Made public for galleryService access
  private isConfigured = true; // Always configured with hardcoded credentials

  constructor() {
    // Initialize with hardcoded credentials
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialized with hardcoded credentials');
  }

  // Check if service is ready (always true now)
  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  // Get current configuration (for display purposes only)
  getConfig(): { url: string; hasApiKey: boolean } {
    return {
      url: SUPABASE_URL,
      hasApiKey: true
    };
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    if (!this.isReady()) {
      console.error('❌ Supabase not configured');
      return false;
    }

    try {
      console.log('🔍 Testing Supabase connection...');
      
      // Try to list buckets to test connection
      const { data, error } = await this.client.storage.listBuckets();
      
      if (error) {
        console.error('❌ Supabase connection test failed:', error.message);
        if (error.message.includes('Invalid API key')) {
          console.error('💡 Please check your Supabase API key configuration');
        }
        return false;
      }

      console.log('✅ Supabase connection test successful. Available buckets:', data?.map(b => b.name) || []);
      return true;
    } catch (error) {
      console.error('❌ Supabase connection test error:', error);
      return false;
    }
  }

  // Database operations
  async createGalleriesTable(): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log('📋 Creating galleries table...');
      
      // Execute SQL to create table
      const { data, error } = await this.client.rpc('create_galleries_table', {
        sql_query: `
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
          
          -- Create index for better performance
          CREATE INDEX IF NOT EXISTS idx_galleries_created_at ON galleries(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_galleries_bucket ON galleries(bucket_name, bucket_folder);
        `
      });

      if (error) {
        console.error('❌ Error creating galleries table:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Galleries table created successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error creating galleries table:', error);
      return { success: false, error: 'Failed to create table' };
    }
  }

  // Alternative method to create table using direct SQL execution
  async executeSQL(sql: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Note: This requires RLS to be configured properly or to be executed by a service role
      const { data, error } = await this.client.rpc('execute_sql', { sql_query: sql });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error executing SQL:', error);
      return { success: false, error: 'SQL execution failed' };
    }
  }

  // Storage operations
  async listFiles(bucketName: string, folder?: string): Promise<StorageFile[]> {
    if (!this.isReady()) {
      console.error('❌ Supabase not configured');
      return [];
    }

    try {
      const path = folder || '';
      console.log(`📂 Listing files in bucket "${bucketName}", folder "${path}"`);
      
      const { data, error } = await this.client.storage
        .from(bucketName)
        .list(path, {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('❌ Error listing files:', error.message);
        return [];
      }

      // Filter only image files
      const imageFiles = (data || []).filter((file: StorageFile) => {
        const isFile = file.metadata; // Files have metadata, folders don't
        const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
        return isFile && isImage;
      });

      console.log(`✅ Found ${imageFiles.length} image files in ${bucketName}/${path}`);
      return imageFiles;
    } catch (error) {
      console.error('❌ Error listing files:', error);
      return [];
    }
  }

  // Get public URL for a file
  getPublicUrl(bucketName: string, filePath: string): string | null {
    if (!this.isReady()) {
      console.error('❌ Supabase not configured');
      return null;
    }

    try {
      const { data } = this.client.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('❌ Error getting public URL:', error);
      return null;
    }
  }

  // Upload file
  async uploadFile(
    bucketName: string, 
    filePath: string, 
    file: File,
    options?: { upsert?: boolean; cacheControl?: string }
  ): Promise<{ success: boolean; error?: string; path?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log(`📤 Uploading file to ${bucketName}/${filePath}`);
      
      const { data, error } = await this.client.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: options?.upsert || false,
          cacheControl: options?.cacheControl || '3600'
        });

      if (error) {
        console.error('❌ Upload error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ File uploaded successfully:', data.path);
      return { success: true, path: data.path };
    } catch (error) {
      console.error('❌ Upload error:', error);
      return { success: false, error: 'Upload failed' };
    }
  }

  // Upload text file (for selection export)
  async uploadTextFile(
    bucketName: string,
    filePath: string,
    content: string,
    options?: { upsert?: boolean }
  ): Promise<{ success: boolean; error?: string; path?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log(`📝 Uploading text file to ${bucketName}/${filePath}`);
      
      const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
      const file = new File([blob], filePath.split('/').pop() || 'selection.txt', { type: 'text/plain' });
      
      return await this.uploadFile(bucketName, filePath, file, options);
    } catch (error) {
      console.error('❌ Text upload error:', error);
      return { success: false, error: 'Text upload failed' };
    }
  }

  // Delete file
  async deleteFile(bucketName: string, filePath: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log(`🗑️ Deleting file ${bucketName}/${filePath}`);
      
      const { data, error } = await this.client.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Delete error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ File deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Delete error:', error);
      return { success: false, error: 'Delete failed' };
    }
  }

  // Move/rename file
  async moveFile(
    bucketName: string, 
    fromPath: string, 
    toPath: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      console.log(`📋 Moving file from ${fromPath} to ${toPath}`);
      
      const { data, error } = await this.client.storage
        .from(bucketName)
        .move(fromPath, toPath);

      if (error) {
        console.error('❌ Move error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ File moved successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Move error:', error);
      return { success: false, error: 'Move failed' };
    }
  }

  // Create folder (by uploading a dummy file and removing it)
  async createFolder(bucketName: string, folderPath: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Create a temporary empty file to establish the folder
      const dummyFile = new File([''], '.gitkeep', { type: 'text/plain' });
      const tempPath = `${folderPath}/.gitkeep`;
      
      const uploadResult = await this.uploadFile(bucketName, tempPath, dummyFile);
      
      if (uploadResult.success) {
        console.log(`✅ Folder created: ${bucketName}/${folderPath}`);
        return { success: true };
      } else {
        return uploadResult;
      }
    } catch (error) {
      console.error('❌ Create folder error:', error);
      return { success: false, error: 'Failed to create folder' };
    }
  }

  // Batch operations
  async uploadMultipleFiles(
    bucketName: string,
    files: { file: File; path: string }[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ successful: string[]; failed: { path: string; error: string }[] }> {
    const successful: string[] = [];
    const failed: { path: string; error: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const { file, path } = files[i];
      
      const result = await this.uploadFile(bucketName, path, file);
      
      if (result.success) {
        successful.push(path);
      } else {
        failed.push({ path, error: result.error || 'Unknown error' });
      }

      onProgress?.(i + 1, files.length);
    }

    return { successful, failed };
  }

  // Utility: Format file size
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Utility: Validate file type
  static isValidImageFile(file: File): boolean {
    const validTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ];
    
    return validTypes.includes(file.type);
  }

  // Utility: Generate unique filename
  static generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    const baseName = originalName.substring(0, originalName.lastIndexOf('.')).replace(/[^a-zA-Z0-9]/g, '-');
    
    return `${baseName}-${timestamp}-${random}${extension}`;
  }
}

// Create singleton instance
export const supabaseService = new SupabaseService();

// Export types
export type { StorageFile };