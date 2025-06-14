import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Heart, MessageSquare, Send } from "lucide-react";
import type { Comment } from "../services/favoritesService";

interface Photo {
  id: string;
  name: string;
  url: string;
  description?: string;
}

interface LightboxProps {
  photos: Photo[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  favorites: Set<string>;
  commentCounts: Record<string, number>;
  comments?: Comment[]; // Add comments prop
  onToggleFavorite: (photoId: string) => void;
  onAddComment: (photoId: string, comment: string) => Promise<void>;
}

export function Lightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  favorites,
  commentCounts,
  comments = [], // Default to empty array
  onToggleFavorite,
  onAddComment
}: LightboxProps) {
  const [comment, setComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const currentPhoto = currentIndex !== null ? photos[currentIndex] : null;

  // Get comments for current photo
  const currentPhotoComments = currentPhoto 
    ? comments.filter(c => c.photoId === currentPhoto.id).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentIndex === null) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onNavigate('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNavigate('next');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onClose, onNavigate]);

  // Prevent body scroll
  useEffect(() => {
    if (currentIndex !== null) {
      document.body.classList.add('lightbox-open');
    } else {
      document.body.classList.remove('lightbox-open');
    }
    
    return () => document.body.classList.remove('lightbox-open');
  }, [currentIndex]);

  // Clear comment when navigating
  useEffect(() => {
    setComment('');
    setShowComments(false); // Hide comments when navigating
  }, [currentIndex]);

  const handleCommentSubmit = async () => {
    if (!currentPhoto || !comment.trim()) return;

    try {
      setIsSubmittingComment(true);
      await onAddComment(currentPhoto.id, comment.trim());
      setComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && comment.trim() && !isSubmittingComment) {
      handleCommentSubmit();
    }
  };

  const formatCommentDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        return 'À l\'instant';
      } else if (diffInHours < 24) {
        return `Il y a ${diffInHours}h`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
          return `Il y a ${diffInDays}j`;
        } else {
          return date.toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'short' 
          });
        }
      }
    } catch (error) {
      return '';
    }
  };

  if (currentIndex === null || !currentPhoto) {
    return null;
  }

  const isInSelection = favorites.has(currentPhoto.id);
  const commentCount = commentCounts[currentPhoto.id] || 0;

  return (
    <div className="lightbox-container animate-fadeIn">
      {/* Close button */}
      <button 
        className="lightbox-close" 
        onClick={onClose}
        title="Fermer (Échap)"
      >
        <X />
      </button>

      {/* Photo counter */}
      <div className="photo-counter">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Navigation buttons */}
      <button
        className="lightbox-nav prev"
        onClick={() => onNavigate('prev')}
        disabled={currentIndex === 0}
        title="Photo précédente (←)"
      >
        <ChevronLeft />
      </button>

      <button
        className="lightbox-nav next"
        onClick={() => onNavigate('next')}
        disabled={currentIndex === photos.length - 1}
        title="Photo suivante (→)"
      >
        <ChevronRight />
      </button>

      {/* Main image */}
      <div className="lightbox-content">
        <img
          src={currentPhoto.url}
          alt={currentPhoto.name}
          className="lightbox-image"
        />
      </div>

      {/* Comments panel */}
      {showComments && currentPhotoComments.length > 0 && (
        <div className="fixed left-4 top-20 bottom-32 w-80 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 z-[100001] overflow-hidden flex flex-col max-w-[calc(100vw-2rem)]">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Commentaires ({currentPhotoComments.length})
            </h3>
            <button
              onClick={() => setShowComments(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {currentPhotoComments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-800 mb-2">{comment.comment}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Appareil: {comment.deviceId.split('_')[1] || 'inconnu'}</span>
                  <span>{formatCommentDate(comment.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="lightbox-controls">
        {/* Selection button */}
        <button
          onClick={() => onToggleFavorite(currentPhoto.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-medium ${
            isInSelection
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
          title={isInSelection ? 'Retirer de la sélection' : 'Ajouter à la sélection'}
        >
          <Heart 
            className={`h-4 w-4 ${isInSelection ? 'fill-current' : ''}`} 
          />
          {isInSelection ? 'Dans la sélection' : 'Ajouter à la sélection'}
        </button>

        {/* Comment count & toggle button */}
        {commentCount > 0 && (
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              showComments 
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            {commentCount} commentaire{commentCount !== 1 ? 's' : ''}
          </button>
        )}

        {/* Comment form */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Ajouter un commentaire..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyPress={handleCommentKeyPress}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmittingComment}
          />
          <button
            onClick={handleCommentSubmit}
            disabled={!comment.trim() || isSubmittingComment}
            className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all"
          >
            {isSubmittingComment ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Commenter
          </button>
        </div>
      </div>

      {/* Photo info (optional) */}
      {currentPhoto.description && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm max-w-md text-center">
          {currentPhoto.description}
        </div>
      )}
    </div>
  );
}