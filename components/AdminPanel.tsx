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
  Info
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { galleryService } from "../services/galleryService";
import { authService } from "../services/authService";
import { supabaseService } from "../services/supabaseService";
import type { Gallery } from "../services/galleryService";

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
  
  // Upload state
  const [uploadingGallery, setUploadingGallery] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number } | null>(null);
  
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
        if (stats.isPasswordProtected) {
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
      const status = await galleryService.getConnectionStatus();
      setConnectionStatus(status);
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

    // Validate bucket folder if provided
    if (newGallery.bucketFolder) {
      const validation = galleryService.validateBucketFolder(newGallery.bucketFolder);
      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }
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
      // Validate bucket folder if changed
      if (editForm.bucketFolder && editForm.bucketFolder !== galleries.find(g => g.id === editingGallery)?.bucketFolder) {
        const validation = galleryService.validateBucketFolder(editForm.bucketFolder);
        if (!validation.isValid) {
          toast.error(validation.error);
          return;
        }
      }

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

  // Photo upload handler
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

      const result = await galleryService.uploadPhotos(
        galleryId,
        validFiles,
        (completed, total) => {
          setUploadProgress({ completed, total });
        }
      );

      if (result.successful.length > 0) {
        toast.success(`Successfully uploaded ${result.successful.length} photos`);
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
          <div className="text-center max-w-md">
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
                <li>• Upload and organize photos by client</li>
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
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.appRouter.navigateTo('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Shield className="h-6 w-6 text-orange-600" />
                  </div>
                  Admin Panel
                </h1>
                <p className="text-muted-foreground">
                  Manage galleries and system settings
                  {sessionInfo.timeRemaining && (
                    <span className="ml-2 text-xs">
                      • Session expires in {formatTimeRemaining(sessionInfo.timeRemaining)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                <Settings className="h-3 w-3 mr-1" />
                Admin Access
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Supabase Connected
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
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
              <CardTitle className="flex items-center gap-2">
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
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

              {/* Setup Info */}
              {!connectionStatus.isTableReady && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Database Setup Required:</strong> Please execute the SQL commands from the <code>SUPABASE_TABLE_SETUP.sql</code> file in your Supabase SQL Editor to create the required database tables.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Galleries</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGalleries}</div>
              <p className="text-xs text-muted-foreground">
                Cloud synchronized galleries
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
              <CardTitle className="text-sm font-medium">Protected Galleries</CardTitle>
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
              Create a new photo gallery for your clients with custom settings and Supabase bucket configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Label htmlFor="allowFavorites" className="text-sm font-medium">Allow Selection</Label>
                    <Switch
                      id="allowFavorites"
                      checked={newGallery.allowFavorites}
                      onCheckedChange={(checked) => setNewGallery(prev => ({ ...prev, allowFavorites: checked }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={createGallery} 
              disabled={isCreating || !newGallery.name.trim()}
              className="w-full"
              size="lg"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating Gallery...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  Create Gallery
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Gallery Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gallery Management
            </CardTitle>
            <CardDescription>
              View and manage all galleries in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search galleries by name, ID, or bucket folder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="outline">
                {filteredGalleries.length} of {galleries.length} galleries
              </Badge>
            </div>

            {/* Gallery List */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading galleries...</p>
              </div>
            ) : filteredGalleries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No galleries found</h3>
                <p className="text-muted-foreground mb-4">
                  {galleries.length === 0 
                    ? "Create your first gallery to get started."
                    : "No galleries match your search criteria."
                  }
                </p>
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGalleries.map((gallery) => (
                  <Card key={gallery.id} className="p-4">
                    {editingGallery === gallery.id ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">Edit Gallery</h3>
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm">Gallery Name</Label>
                              <Input
                                value={editForm.name || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Bucket Folder</Label>
                              <Input
                                value={editForm.bucketFolder || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, bucketFolder: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Password</Label>
                              <Input
                                type="password"
                                value={editForm.password || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                placeholder="Leave empty to remove password"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm">Description</Label>
                              <Textarea
                                value={editForm.description || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={2}
                              />
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Public Gallery</Label>
                                <Switch
                                  checked={editForm.isPublic ?? true}
                                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isPublic: checked }))}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Allow Comments</Label>
                                <Switch
                                  checked={editForm.allowComments ?? true}
                                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, allowComments: checked }))}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Allow Selection</Label>
                                <Switch
                                  checked={editForm.allowFavorites ?? true}
                                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, allowFavorites: checked }))}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{gallery.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {gallery.id}
                            </Badge>
                            {gallery.password && (
                              <Badge variant="secondary" className="text-xs">
                                <Key className="h-3 w-3 mr-1" />
                                Protected
                              </Badge>
                            )}
                            {!gallery.isPublic && (
                              <Badge variant="outline" className="text-xs">
                                Private
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            {gallery.description && (
                              <p>{gallery.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs">
                              <span>📂 {gallery.bucketFolder || 'No folder set'}</span>
                              <span>📊 {gallery.photoCount || 0} photos</span>
                              <span>📅 Created {new Date(gallery.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
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
                          
                          <div className="relative">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(gallery.id, e.target.files)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={uploadingGallery === gallery.id}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={uploadingGallery === gallery.id}
                            >
                              {uploadingGallery === gallery.id ? (
                                <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              Upload
                            </Button>
                          </div>
                          
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
                    )}
                    
                    {/* Upload Progress */}
                    {uploadingGallery === gallery.id && uploadProgress && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading photos...</span>
                          <span>{uploadProgress.completed}/{uploadProgress.total}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}