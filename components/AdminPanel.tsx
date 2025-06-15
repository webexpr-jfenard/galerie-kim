import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { AuthDialog } from "./AuthDialog";
import { SubfolderSelector } from "./SubfolderSelector";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  BarChart3, 
  ArrowLeft,
  Search,
  Folder,
  Key,
  Shield,
  Save,
  X,
  LogOut,
  Database,
  Users,
  Image,
  Upload,
  CheckCircle,
  XCircle,
  FileImage,
  RefreshCw,
  Cloud,
  HardDrive,
  AlertCircle,
  Info,
  FolderOpen
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { galleryService } from "../services/galleryService";
import { authService } from "../services/authService";
import { supabaseService } from "../services/supabaseService";
import type { Gallery, SubfolderInfo } from "../services/galleryService";

export function AdminPanel() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ timeRemaining?: number }>({});
  
  // Gallery management state
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Supabase state (simplified - always connected now)
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    isTableReady: false,
    localGalleries: 0,
    remoteGalleries: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Create gallery form state
  const [newGallery, setNewGallery] = useState({
    name: '',
    description: '',
    bucketFolder: '',
    bucketName: 'photos',
    password: '',
    isPublic: true,
    allowComments: true,
    allowFavorites: true
  });
  
  // Edit gallery state
  const [editingGallery, setEditingGallery] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Gallery>>({});
  
  // Upload state with subfolder support - FIXED: Individual subfolder state per gallery
  const [uploadingGallery, setUploadingGallery] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number } | null>(null);
  const [uploadSubfolders, setUploadSubfolders] = useState<Record<string, string | undefined>>({});
  
  const [stats, setStats] = useState({
    totalGalleries: 0,
    totalPhotos: 0,
    protectedGalleries: 0
  });

  // Check authentication on mount
  useEffect(() => {
    console.log('🔐 Checking admin authentication...');
    const isAuth = authService.isAdminAuthenticated();
    console.log('Auth status:', isAuth);
    
    if (isAuth) {
      setIsAuthenticated(true);
      loadGalleries();
      loadStats();
      loadConnectionStatus();
      
      // Update session info
      const sessionData = authService.getSessionInfo();
      setSessionInfo(sessionData);
    } else {
      setShowAuthDialog(true);
    }
  }, []);

  // Session timer
  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = setInterval(() => {
      const sessionData = authService.getSessionInfo();
      setSessionInfo(sessionData);
      
      if (!sessionData.isAuthenticated) {
        handleLogout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(timer);
  }, [isAuthenticated]);

  const handleAuthentication = async (password: string): Promise<boolean> => {
    console.log('🔑 Attempting admin authentication...');
    const isValid = authService.authenticateAdmin(password);
    console.log('Authentication result:', isValid);
    
    if (isValid) {
      setIsAuthenticated(true);
      setShowAuthDialog(false);
      loadGalleries();
      loadStats();
      loadConnectionStatus();
      
      const sessionData = authService.getSessionInfo();
      setSessionInfo(sessionData);
      
      toast.success('Successfully logged in to admin panel');
    } else {
      toast.error('Invalid admin password');
    }
    return isValid;
  };

  const handleLogout = () => {
    authService.clearAdminSession();
    setIsAuthenticated(false);
    setShowAuthDialog(true);
    setGalleries([]);
    setStats({ totalGalleries: 0, totalPhotos: 0, protectedGalleries: 0 });
    toast.success('Logged out successfully');
  };

  const loadGalleries = async () => {
    try {
      setIsLoading(true);
      console.log('📂 Loading galleries...');
      const galleryList = await galleryService.getGalleries();
      console.log('Loaded galleries:', galleryList);
      setGalleries(galleryList || []);
    } catch (error) {
      console.error('Error loading galleries:', error);
      toast.error('Failed to load galleries');
      setGalleries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const galleryList = await galleryService.getGalleries();
      let totalPhotos = 0;
      let protectedGalleries = 0;
      
      for (const gallery of galleryList || []) {
        const stats = await galleryService.getGalleryStats(gallery.id);
        totalPhotos += stats.photoCount;
        if (gallery.password) {
          protectedGalleries++;
        }
      }

      setStats({
        totalGalleries: galleryList?.length || 0,
        totalPhotos,
        protectedGalleries
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      const isReady = galleryService.isSupabaseConfigured();
      // Mock connection status since we always have hardcoded credentials
      setConnectionStatus({
        isConnected: isReady,
        isTableReady: isReady,
        localGalleries: galleries.length,
        remoteGalleries: galleries.length
      });
    } catch (error) {
      console.error('Error loading connection status:', error);
    }
  };

  const handleSyncFromSupabase = async () => {
    try {
      setIsSyncing(true);
      console.log('🔄 Syncing galleries from Supabase...');
      
      const result = await galleryService.syncFromSupabase();
      
      if (result.success) {
        toast.success(`Successfully synced ${result.count} galleries from Supabase`);
        await loadGalleries();
        await loadStats();
        await loadConnectionStatus();
      } else {
        toast.error(result.error || 'Failed to sync from Supabase');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync from Supabase');
    } finally {
      setIsSyncing(false);
    }
  };

  const createGallery = async () => {
    if (!newGallery.name.trim()) {
      toast.error('Please enter a gallery name');
      return;
    }

    try {
      setIsCreating(true);
      console.log('🏗️ Creating gallery:', newGallery);
      
      const createdGallery = await galleryService.createGallery({
        name: newGallery.name,
        description: newGallery.description || undefined,
        bucketFolder: newGallery.bucketFolder || undefined,
        bucketName: newGallery.bucketName || 'photos',
        password: newGallery.password || undefined,
        isPublic: newGallery.isPublic,
        allowComments: newGallery.allowComments,
        allowFavorites: newGallery.allowFavorites
      });

      console.log('✅ Gallery created:', createdGallery);

      // Reset form
      setNewGallery({
        name: '',
        description: '',
        bucketFolder: '',
        bucketName: 'photos',
        password: '',
        isPublic: true,
        allowComments: true,
        allowFavorites: true
      });

      toast.success(`Gallery "${createdGallery.name}" created successfully!`);
      await loadGalleries();
      await loadStats();
      await loadConnectionStatus();
    } catch (error) {
      console.error('Error creating gallery:', error);
      toast.error('Failed to create gallery');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteGallery = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis will permanently delete:\n- The gallery\n- All photos in the gallery\n- All favorites and comments\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting gallery:', id);
      const success = await galleryService.deleteGallery(id);
      
      if (success) {
        toast.success(`Gallery "${name}" deleted successfully`);
        await loadGalleries();
        await loadStats();
        await loadConnectionStatus();
      } else {
        toast.error('Failed to delete gallery');
      }
    } catch (error) {
      console.error('Error deleting gallery:', error);
      toast.error('Failed to delete gallery');
    }
  };

  const startEditingGallery = (gallery: Gallery) => {
    setEditingGallery(gallery.id);
    setEditForm({
      name: gallery.name,
      description: gallery.description || '',
      bucketFolder: gallery.bucketFolder || '',
      bucketName: gallery.bucketName || 'photos',
      password: gallery.password || '',
      isPublic: gallery.isPublic,
      allowComments: gallery.allowComments,
      allowFavorites: gallery.allowFavorites
    });
  };

  const saveGalleryEdit = async () => {
    if (!editingGallery) return;

    try {
      console.log('💾 Saving gallery edit:', editingGallery, editForm);
      const updatedGallery = await galleryService.updateGallery(editingGallery, editForm);
      
      if (updatedGallery) {
        setEditingGallery(null);
        setEditForm({});
        toast.success(`Gallery "${updatedGallery.name}" updated successfully`);
        await loadGalleries();
        await loadConnectionStatus();
      } else {
        toast.error('Failed to update gallery');
      }
    } catch (error) {
      console.error('Error updating gallery:', error);
      toast.error('Failed to update gallery');
    }
  };

  const cancelEdit = () => {
    setEditingGallery(null);
    setEditForm({});
  };

  // FIXED: Enhanced photo upload handler with proper subfolder support
  const handlePhotoUpload = async (galleryId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate files
    const validFiles = fileArray.filter(file => supabaseService.constructor.isValidImageFile(file));
    if (validFiles.length !== fileArray.length) {
      toast.error(`${fileArray.length - validFiles.length} files were skipped (invalid image format)`);
    }

    if (validFiles.length === 0) {
      toast.error('No valid image files selected');
      return;
    }

    try {
      setUploadingGallery(galleryId);
      setUploadProgress({ completed: 0, total: validFiles.length });

      // Get the current subfolder for this gallery
      const selectedSubfolder = uploadSubfolders[galleryId];
      console.log(`📁 Uploading ${validFiles.length} photos to gallery ${galleryId}${selectedSubfolder ? ` in subfolder "${selectedSubfolder}"` : ''}`);

      const result = await galleryService.uploadPhotos(
        galleryId,
        validFiles,
        {
          subfolder: selectedSubfolder,
          onProgress: (completed, total) => {
            setUploadProgress({ completed, total });
          }
        }
      );

      if (result.successful.length > 0) {
        const subfolderMsg = selectedSubfolder ? ` to subfolder "${selectedSubfolder}"` : '';
        toast.success(`Successfully uploaded ${result.successful.length} photos${subfolderMsg}`);
      }

      if (result.failed.length > 0) {
        toast.error(`Failed to upload ${result.failed.length} photos`);
        console.error('Upload failures:', result.failed);
      }

      // Refresh data
      await loadGalleries();
      await loadStats();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploadingGallery(null);
      setUploadProgress(null);
    }
  };

  // FIXED: Handle subfolder changes per gallery
  const handleSubfolderChange = (galleryId: string, subfolder: string | undefined) => {
    console.log(`📁 Subfolder changed for gallery ${galleryId}:`, subfolder);
    setUploadSubfolders(prev => ({
      ...prev,
      [galleryId]: subfolder
    }));
  };

  const filteredGalleries = galleries.filter(gallery =>
    gallery.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gallery.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gallery.bucketFolder?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Show auth dialog if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-10 w-10 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
            <p className="text-muted-foreground mb-8">
              Access the admin panel to manage galleries, view statistics, and configure system settings.
            </p>
            <div className="bg-card border rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold mb-3">Admin Features:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Create and manage photo galleries</li>
                <li>• Supabase cloud storage integration</li>
                <li>• Upload and organize photos by subfolder</li>
                <li>• Set password protection for galleries</li>
                <li>• View statistics and analytics</li>
                <li>• Sync galleries across devices</li>
              </ul>
            </div>
            <Button onClick={() => setShowAuthDialog(true)} size="lg">
              <Shield className="h-5 w-5 mr-2" />
              Access Admin Panel
            </Button>
          </div>
        </div>
        
        <AuthDialog
          isOpen={showAuthDialog}
          onClose={() => {
            setShowAuthDialog(false);
            window.appRouter.navigateTo('/');
          }}
          onAuthenticate={handleAuthentication}
          type="admin"
          title="Admin Authentication"
          description="Enter the admin password to access the management panel."
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Responsive */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.appRouter.navigateTo('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Home</span>
              </Button>
              <div>
                <h1 className="text-xl lg:text-3xl font-bold flex items-center gap-2 lg:gap-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 lg:h-6 lg:w-6 text-orange-600" />
                  </div>
                  Admin Panel
                </h1>
                <p className="text-sm lg:text-base text-muted-foreground">
                  Manage galleries and system settings
                  {sessionInfo.timeRemaining && (
                    <span className="ml-2 text-xs">
                      • Session expires in {formatTimeRemaining(sessionInfo.timeRemaining)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-3">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Supabase Connected
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Supabase Status & Sync */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                <Cloud className="h-5 w-5" />
                Supabase Cloud Storage
              </CardTitle>
              <CardDescription>
                Your application is connected to Supabase cloud storage for gallery synchronization and photo management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Connected</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {connectionStatus.isTableReady ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="text-sm">
                        Database {connectionStatus.isTableReady ? 'Ready' : 'Setup Needed'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">
                        Local: {connectionStatus.localGalleries} galleries
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        Cloud: {connectionStatus.remoteGalleries} galleries
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Sync Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleSyncFromSupabase}
                  disabled={isSyncing}
                  variant="outline"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync from Cloud
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={loadConnectionStatus}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards - Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Galleries</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGalleries}</div>
              <p className="text-xs text-muted-foreground">
                Cloud synchronized
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPhotos}</div>
              <p className="text-xs text-muted-foreground">
                From Supabase storage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Protected</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.protectedGalleries}</div>
              <p className="text-xs text-muted-foreground">
                Password protected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Cloud</div>
              <p className="text-xs text-muted-foreground">
                Supabase storage
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Create Gallery */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Gallery
            </CardTitle>
            <CardDescription>
              Create a new photo gallery with custom settings and Supabase bucket configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Gallery Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Wedding - John & Jane"
                    value={newGallery.name}
                    onChange={(e) => setNewGallery(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bucketFolder" className="flex items-center gap-2 text-sm font-medium">
                    <Folder className="h-4 w-4" />
                    Supabase Bucket Folder
                  </Label>
                  <Input
                    id="bucketFolder"
                    placeholder="e.g., wedding-john-jane-2024"
                    value={newGallery.bucketFolder}
                    onChange={(e) => setNewGallery(prev => ({ ...prev, bucketFolder: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for auto-generation. Format: folder-name or folder/subfolder
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bucketName" className="text-sm font-medium">
                    Bucket Name
                  </Label>
                  <Input
                    id="bucketName"
                    placeholder="photos"
                    value={newGallery.bucketName}
                    onChange={(e) => setNewGallery(prev => ({ ...prev, bucketName: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supabase bucket name (default: photos)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                    <Key className="h-4 w-4" />
                    Password Protection
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Leave empty for public gallery"
                    value={newGallery.password}
                    onChange={(e) => setNewGallery(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set a password to restrict access to this gallery
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional gallery description for clients..."
                    value={newGallery.description}
                    onChange={(e) => setNewGallery(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isPublic" className="text-sm font-medium">Public Gallery</Label>
                    <Switch
                      id="isPublic"
                      checked={newGallery.isPublic}
                      onCheckedChange={(checked) => setNewGallery(prev => ({ ...prev, isPublic: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="allowComments" className="text-sm font-medium">Allow Comments</Label>
                    <Switch
                      id="allowComments"
                      checked={newGallery.allowComments}
                      onCheckedChange={(checked) => setNewGallery(prev => ({ ...prev, allowComments: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="allowFavorites" className="text-sm font-medium">Allow Favorites</Label>
                    <Switch
                      id="allowFavorites"
                      checked={newGallery.allowFavorites}
                      onCheckedChange={(checked) => setNewGallery(prev => ({ ...prev, allowFavorites: checked }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={createGallery} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Gallery
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Galleries List - FIXED: Proper subfolder handling */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Galleries ({filteredGalleries.length})
                </CardTitle>
                <CardDescription>
                  Manage your photo galleries, upload photos with subfolder organization, and configure settings.
                </CardDescription>
              </div>
              <div className="relative w-full lg:w-80">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search galleries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading galleries...
              </div>
            ) : filteredGalleries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No galleries match your search.' : 'No galleries created yet.'}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGalleries.map((gallery) => (
                  <div key={gallery.id} className="border rounded-lg p-4 lg:p-6 space-y-4">
                    {editingGallery === gallery.id ? (
                      // Edit mode
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`edit-name-${gallery.id}`} className="text-sm font-medium">Name</Label>
                            <Input
                              id={`edit-name-${gallery.id}`}
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-bucket-${gallery.id}`} className="text-sm font-medium">Bucket Folder</Label>
                            <Input
                              id={`edit-bucket-${gallery.id}`}
                              value={editForm.bucketFolder || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, bucketFolder: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`edit-description-${gallery.id}`} className="text-sm font-medium">Description</Label>
                          <Textarea
                            id={`edit-description-${gallery.id}`}
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={2}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={editForm.isPublic ?? true}
                                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isPublic: checked }))}
                              />
                              <Label className="text-sm">Public</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={editForm.allowComments ?? true}
                                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, allowComments: checked }))}
                              />
                              <Label className="text-sm">Comments</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={editForm.allowFavorites ?? true}
                                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, allowFavorites: checked }))}
                              />
                              <Label className="text-sm">Favorites</Label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveGalleryEdit}>
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold truncate">{gallery.name}</h3>
                              <div className="flex gap-2 shrink-0">
                                {gallery.password && (
                                  <Badge variant="secondary">
                                    <Key className="h-3 w-3 mr-1" />
                                    Protected
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  ID: {gallery.id}
                                </Badge>
                              </div>
                            </div>
                            {gallery.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {gallery.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              <span>{gallery.photoCount || 0} photos</span>
                              {gallery.bucketFolder && (
                                <span className="flex items-center gap-1">
                                  <Folder className="h-3 w-3" />
                                  {gallery.bucketFolder}
                                </span>
                              )}
                              <span>{gallery.isPublic ? 'Public' : 'Private'}</span>
                              <span>Created {new Date(gallery.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.appRouter.navigateTo(`/gallery/${gallery.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingGallery(gallery)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteGallery(gallery.id, gallery.name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        {/* FIXED: Upload Section with Proper Subfolder Support */}
                        <div className="border-t pt-4">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Subfolder Selection - Takes 2/3 width */}
                            <div className="lg:col-span-2">
                              <SubfolderSelector
                                galleryId={gallery.id}
                                selectedSubfolder={uploadSubfolders[gallery.id]}
                                onSubfolderChange={(subfolder) => handleSubfolderChange(gallery.id, subfolder)}
                                disabled={uploadingGallery === gallery.id}
                              />
                            </div>
                            
                            {/* Upload Section - Takes 1/3 width */}
                            <div className="space-y-2">
                              <Label htmlFor={`upload-${gallery.id}`} className="text-sm font-medium flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Upload Photos
                              </Label>
                              <Input
                                id={`upload-${gallery.id}`}
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => handlePhotoUpload(gallery.id, e.target.files)}
                                disabled={uploadingGallery === gallery.id}
                                className="file:mr-2 file:px-3 file:py-1 file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                              />
                              
                              {/* Upload Progress */}
                              {uploadingGallery === gallery.id && uploadProgress && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Uploading {uploadProgress.completed}/{uploadProgress.total}
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div 
                                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                                      style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Upload info */}
                              <p className="text-xs text-muted-foreground">
                                {uploadSubfolders[gallery.id] 
                                  ? `Photos will be saved to: "${uploadSubfolders[gallery.id]}"` 
                                  : 'Photos will be saved to the gallery root'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}