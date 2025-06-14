import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Lightbox } from "./Lightbox";
import { SelectionSubmitButton } from "./SelectionSubmitButton";
import { 
  ArrowLeft, 
  Heart, 
  MessageSquare, 
  Search,
  Download,
  Share2,
  Trash2
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { galleryService } from "../services/galleryService";
import { favoritesService } from "../services/favoritesService";
import type { Gallery, Photo } from "../services/galleryService";
import type { FavoritePhoto, Comment } from "../services/favoritesService";

interface FavoritesPageProps {
  galleryId: string;
}

export function FavoritesPage({ galleryId }: FavoritesPageProps) {
  // State
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [favorites, setFavorites] = useState<FavoritePhoto[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [photoCommentCounts, setPhotoCommentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, [galleryId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log(`📂 Loading favorites for gallery: ${galleryId}`);

      // Load gallery info
      const galleryData = await galleryService.getGallery(galleryId);
      if (!galleryData) {
        toast.error(`Gallery "${galleryId}" not found`);
        return;
      }
      setGallery(galleryData);

      // Load all photos from gallery
      const photoList = await galleryService.getPhotos(galleryId);
      setAllPhotos(photoList);

      // Load shared favorites
      const favoritesList = await favoritesService.getFavorites(galleryId);
      setFavorites(favoritesList);
      console.log(`✅ Loaded ${favoritesList.length} shared favorites`);

      // Load comments
      const commentsList = await favoritesService.getComments(galleryId);
      setComments(commentsList);
      
      // Count comments per photo
      const commentCounts: Record<string, number> = {};
      commentsList.forEach(comment => {
        commentCounts[comment.photoId] = (commentCounts[comment.photoId] || 0) + 1;
      });
      setPhotoCommentCounts(commentCounts);

      console.log(`✅ Loaded ${commentsList.length} comments`);

    } catch (error) {
      console.error('Error loading favorites data:', error);
      toast.error('Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromFavorites = async (photoId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    try {
      await favoritesService.removeFromFavorites(galleryId, photoId);
      
      // Update local state
      setFavorites(prev => prev.filter(fav => fav.photoId !== photoId));
      
      toast.success('Retiré de la sélection');
    } catch (error) {
      console.error('Error removing from favorites:', error);
      toast.error('Failed to remove from selection');
    }
  };

  const clearAllFavorites = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer toute la sélection ?\n\nCette action ne peut pas être annulée et affectera tous les appareils.`)) {
      return;
    }

    try {
      const success = await favoritesService.clearAllFavorites(galleryId);
      if (success) {
        setFavorites([]);
        toast.success('Sélection effacée');
      } else {
        toast.error('Failed to clear selection');
      }
    } catch (error) {
      console.error('Error clearing favorites:', error);
      toast.error('Failed to clear selection');
    }
  };

  const addComment = async (photoId: string, comment: string) => {
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
      : Math.min(favoritePhotos.length - 1, lightboxIndex + 1);
    
    setLightboxIndex(newIndex);
  }, [lightboxIndex]);

  // Get actual photo objects for favorited photos
  const favoritePhotos = allPhotos.filter(photo => 
    favorites.some(fav => fav.photoId === photo.id)
  );

  // Filter favorite photos based on search
  const filteredFavoritePhotos = favoritePhotos.filter(photo =>
    photo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    photo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create selection set for lightbox
  const selectionSet = new Set(favorites.map(fav => fav.photoId));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de la sélection...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Galerie Non Trouvée</h1>
          <p className="text-muted-foreground mb-6">
            La galerie "{galleryId}" n'existe pas ou n'est plus disponible.
          </p>
          <Button onClick={() => window.appRouter.goHome()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Button>
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
                onClick={() => window.appRouter.navigateTo(`/gallery/${galleryId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la galerie
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Heart className="h-6 w-6 text-red-500 fill-current" />
                  Sélection
                </h1>
                <p className="text-sm text-muted-foreground">
                  {gallery.name} • {filteredFavoritePhotos.length} photos sélectionnées • Partagée entre tous les appareils
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {favorites.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFavorites}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Tout effacer
                  </Button>
                  
                  {/* Submit Selection Button */}
                  <SelectionSubmitButton 
                    galleryId={galleryId}
                    galleryName={gallery.name}
                    variant="default"
                    size="sm"
                  />
                </>
              )}
            </div>
          </div>

          {/* Search */}
          {favorites.length > 0 && (
            <div className="relative max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans la sélection..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">Aucune photo sélectionnée</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Aucune photo n'a encore été ajoutée à la sélection. 
              Retournez à la galerie et cliquez sur le cœur pour sélectionner vos photos préférées.
            </p>
            <Button onClick={() => window.appRouter.navigateTo(`/gallery/${galleryId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Parcourir la galerie
            </Button>
          </div>
        ) : filteredFavoritePhotos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground mb-4">
              Aucune photo ne correspond à votre recherche.
            </p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Effacer la recherche
            </Button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-6">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>{filteredFavoritePhotos.length} photos sélectionnées</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span>{comments.length} commentaires</span>
                </div>
                {searchTerm && (
                  <Badge variant="outline">
                    Recherche: "{searchTerm}"
                  </Badge>
                )}
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="masonry-grid">
              {filteredFavoritePhotos.map((photo, index) => (
                <div key={photo.id} className="masonry-item animate-fadeIn">
                  {/* Photo */}
                  <div className="photo-container" onClick={() => openLightbox(index)}>
                    <img
                      src={photo.url}
                      alt={photo.name}
                      loading="lazy"
                      className="photo-image"
                    />

                    {/* Remove from selection button */}
                    <button
                      className="favorite-indicator is-favorite"
                      onClick={(e) => removeFromFavorites(photo.id, e)}
                      title="Retirer de la sélection"
                    >
                      <Heart className="h-5 w-5 fill-current text-white" />
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
                                addComment(photo.id, target.value);
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
                              addComment(photo.id, input.value);
                              input.value = '';
                            }
                          }}
                        >
                          <MessageSquare className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        photos={filteredFavoritePhotos}
        currentIndex={lightboxIndex}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
        favorites={selectionSet}
        commentCounts={photoCommentCounts}
        comments={comments} // Pass all comments for lightbox display
        onToggleFavorite={removeFromFavorites}
        onAddComment={addComment}
      />
    </div>
  );
}