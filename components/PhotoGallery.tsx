import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { AuthDialog } from "./AuthDialog";
import { Lightbox } from "./Lightbox";
import { SelectionSubmitButton } from "./SelectionSubmitButton";
import { 
  ArrowLeft, 
  Heart, 
  MessageSquare, 
  Search,
  Send
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { galleryService } from "../services/galleryService";
import { favoritesService } from "../services/favoritesService";
import type { Gallery, Photo } from "../services/galleryService";
import type { FavoritePhoto, Comment } from "../services/favoritesService";

interface PhotoGalleryProps {
  galleryId: string;
}

export function PhotoGallery({ galleryId }: PhotoGalleryProps) {
  // Gallery state
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  
  // Selection (shared across all devices) and comments
  const [selection, setSelection] = useState<Set<string>>(new Set()); // Shared favorites
  const [comments, setComments] = useState<Comment[]>([]);
  const [photoCommentCounts, setPhotoCommentCounts] = useState<Record<string, number>>({});
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Load gallery data
  useEffect(() => {
    loadGalleryData();
  }, [galleryId]);

  const loadGalleryData = async () => {
    try {
      setIsLoading(true);
      
      console.log(`🔍 Loading gallery data for: ${galleryId}`);
      
      // Load gallery info
      let galleryData = await galleryService.getGallery(galleryId);
      
      // If gallery not found and Supabase is configured, try to sync
      if (!galleryData && galleryService.isSupabaseConfigured()) {
        console.log('📡 Gallery not found locally, trying to sync from Supabase...');
        toast.loading('Synchronisation des galeries depuis le cloud...', { id: 'sync-toast' });
        
        try {
          const syncResult = await galleryService.syncFromSupabase();
          if (syncResult.success) {
            console.log(`✅ Sync successful, found ${syncResult.count} galleries`);
            toast.success(`${syncResult.count} galeries synchronisées`, { id: 'sync-toast' });
            
            // Try to load gallery again after sync
            galleryData = await galleryService.getGallery(galleryId);
          } else {
            console.warn(`⚠️ Sync failed: ${syncResult.error}`);
            toast.error(`Échec de la synchronisation: ${syncResult.error}`, { id: 'sync-toast' });
          }
        } catch (syncError) {
          console.error('❌ Sync error:', syncError);
          toast.error('Erreur lors de la synchronisation', { id: 'sync-toast' });
        }
      }
      
      if (!galleryData) {
        console.error(`❌ Gallery ${galleryId} not found after all attempts`);
        toast.error(`Galerie "${galleryId}" non trouvée`);
        return;
      }

      console.log(`✅ Gallery loaded: ${galleryData.name}`);

      // Check if authentication is needed
      if (galleryData.password && !galleryService.isGalleryAuthenticated(galleryId)) {
        console.log('🔐 Gallery requires authentication');
        setNeedsAuth(true);
        return;
      }

      setGallery(galleryData);

      // Load photos
      console.log('📸 Loading photos...');
      const photoList = await galleryService.getPhotos(galleryId);
      console.log(`✅ Loaded ${photoList.length} photos`);
      setPhotos(photoList);

      // Load shared selection (favorites from all devices)
      console.log('❤️ Loading shared selection...');
      const favoritesList = await favoritesService.getFavorites(galleryId);
      const selectedIds = new Set(favoritesList.map(f => f.photoId));
      console.log(`✅ Loaded ${favoritesList.length} shared favorites`);
      setSelection(selectedIds);

      // Load comments
      console.log('💬 Loading comments...');
      const commentsList = await favoritesService.getComments(galleryId);
      setComments(commentsList);
      console.log(`✅ Loaded ${commentsList.length} comments`);
      
      // Count comments per photo
      const commentCounts: Record<string, number> = {};
      commentsList.forEach(comment => {
        commentCounts[comment.photoId] = (commentCounts[comment.photoId] || 0) + 1;
      });
      setPhotoCommentCounts(commentCounts);

      console.log('🎉 Gallery data loading complete');

    } catch (error) {
      console.error('❌ Error loading gallery:', error);
      toast.error('Erreur lors du chargement de la galerie');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthentication = async (password: string): Promise<boolean> => {
    try {
      const isValid = await galleryService.authenticateGallery(galleryId, password);
      if (isValid) {
        setNeedsAuth(false);
        loadGalleryData();
      }
      return isValid;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  };

  const toggleSelection = async (photoId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    try {
      const isSelected = selection.has(photoId);
      
      if (isSelected) {
        await favoritesService.removeFromFavorites(galleryId, photoId);
        
        // Update local state
        setSelection(prev => {
          const newSet = new Set(prev);
          newSet.delete(photoId);
          return newSet;
        });
        
        toast.success('Retiré de la sélection');
      } else {
        await favoritesService.addToFavorites(galleryId, photoId);
        
        // Update local state
        setSelection(prev => new Set([...prev, photoId]));
        
        toast.success('Ajouté à la sélection');
      }
      
    } catch (error) {
      console.error('Error updating selection:', error);
      toast.error('Failed to update selection');
    }
  };

  const submitComment = async (photoId: string, comment: string) => {
    if (!comment.trim()) return;

    try {
      const newComment = await favoritesService.addComment(galleryId, photoId, comment.trim());
      
      // Update comments list
      setComments(prev => [...prev, newComment]);
      
      // Update comment counts
      setPhotoCommentCounts(prev => ({
        ...prev,
        [photoId]: (prev[photoId] || 0) + 1
      }));
      
      toast.success('Commentaire ajouté');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const openLightbox = (photoIndex: number) => {
    setLightboxIndex(photoIndex);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (lightboxIndex === null) return;
    
    const newIndex = direction === 'prev' 
      ? Math.max(0, lightboxIndex - 1)
      : Math.min(filteredPhotos.length - 1, lightboxIndex + 1);
    
    setLightboxIndex(newIndex);
  }, [lightboxIndex]);

  // Filter photos based on search
  const filteredPhotos = photos.filter(photo =>
    photo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    photo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auth dialog
  if (needsAuth) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Galerie Protégée</h1>
            <p className="text-muted-foreground mb-6">
              Cette galerie est protégée par mot de passe. Veuillez saisir le mot de passe pour voir les photos.
            </p>
          </div>
        </div>
        
        <AuthDialog
          isOpen={needsAuth}
          onClose={() => window.appRouter.navigateTo('/')}
          onAuthenticate={handleAuthentication}
          type="gallery"
          galleryName={gallery?.name}
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de la galerie...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold mb-4">Galerie Non Trouvée</h1>
          <p className="text-muted-foreground mb-6">
            La galerie "{galleryId}" n'existe pas ou n'est plus disponible.
          </p>
          
          {galleryService.isSupabaseConfigured() && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Synchronisation Cloud</h3>
              <p className="text-sm text-blue-700 mb-3">
                La galerie pourrait exister dans le cloud mais n'a pas encore été synchronisée sur cet appareil.
              </p>
              <Button 
                onClick={() => {
                  loadGalleryData();
                }}
                size="sm"
                className="w-full"
              >
                🔄 Essayer de synchroniser
              </Button>
            </div>
          )}
          
          <div className="space-y-3">
            <Button 
              onClick={() => window.appRouter.navigateTo('/')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Button>
            
            {!galleryService.isSupabaseConfigured() && (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                💡 Astuce : Pour accéder aux galeries sur plusieurs appareils, configurez Supabase dans le panneau d'administration.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.appRouter.navigateTo('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Accueil
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{gallery.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredPhotos.length} photos • {selection.size} sélectionnées • {comments.length} commentaires
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.appRouter.navigateTo(`/favorites/${galleryId}`)}
              >
                <Heart className="h-4 w-4 mr-2" />
                Ma sélection ({selection.size})
              </Button>
              
              {/* Submit Selection Button */}
              <SelectionSubmitButton 
                galleryId={galleryId}
                galleryName={gallery.name}
                variant="default"
                size="sm"
              />
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher des photos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="container mx-auto px-4 py-8">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground mb-4">
              {searchTerm ? 'Aucune photo ne correspond à votre recherche.' : 'Aucune photo dans cette galerie pour le moment.'}
            </p>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Effacer la recherche
              </Button>
            )}
          </div>
        ) : (
          <div className="masonry-grid">
            {filteredPhotos.map((photo, index) => (
              <div key={photo.id} className="masonry-item animate-fadeIn">
                {/* Photo */}
                <div className="photo-container" onClick={() => openLightbox(index)}>
                  <img
                    src={photo.url}
                    alt={photo.name}
                    loading="lazy"
                    className="photo-image"
                  />

                  {/* Selection indicator */}
                  <button
                    className={`favorite-indicator ${selection.has(photo.id) ? 'is-favorite' : ''}`}
                    onClick={(e) => toggleSelection(photo.id, e)}
                    title={selection.has(photo.id) ? 'Retirer de la sélection' : 'Ajouter à la sélection'}
                  >
                    <Heart 
                      className={`h-5 w-5 transition-all ${
                        selection.has(photo.id)
                          ? 'fill-current text-white' // Selected - filled red heart
                          : 'text-gray-600' // Not selected - gray
                      }`} 
                    />
                  </button>

                  {/* Comment indicator */}
                  {photoCommentCounts[photo.id] > 0 && (
                    <div className="comment-indicator">
                      <MessageSquare className="h-3 w-3" />
                      {photoCommentCounts[photo.id]}
                    </div>
                  )}

                  {/* Hover overlay with quick comment */}
                  <div className="photo-overlay">
                    <div></div>
                    <div className="quick-comment-form">
                      <input
                        type="text"
                        placeholder="Ajouter un commentaire..."
                        className="quick-comment-input"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const target = e.target as HTMLInputElement;
                            if (target.value.trim()) {
                              submitComment(photo.id, target.value);
                              target.value = '';
                            }
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        className="quick-comment-submit"
                        onClick={(e) => {
                          e.stopPropagation();
                          const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                          if (input?.value.trim()) {
                            submitComment(photo.id, input.value);
                            input.value = '';
                          }
                        }}
                      >
                        <Send className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        photos={filteredPhotos}
        currentIndex={lightboxIndex}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
        favorites={selection} // Shared favorites
        commentCounts={photoCommentCounts}
        comments={comments} // Pass all comments for lightbox display
        onToggleFavorite={toggleSelection}
        onAddComment={submitComment}
      />
    </div>
  );
}