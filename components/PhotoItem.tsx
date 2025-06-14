import React, { useState } from "react";
import { Heart, MessageSquare, Send } from "lucide-react";

interface Photo {
  id: string;
  name: string;
  url: string;
  description?: string;
}

interface PhotoItemProps {
  photo: Photo;
  isFavorite: boolean;
  commentCount: number;
  onToggleFavorite: (photoId: string) => void;
  onAddComment: (photoId: string, comment: string) => void;
  onClick?: () => void;
  className?: string;
}

export function PhotoItem({
  photo,
  isFavorite,
  commentCount,
  onToggleFavorite,
  onAddComment,
  onClick,
  className = ""
}: PhotoItemProps) {
  const [quickComment, setQuickComment] = useState('');

  const handleQuickComment = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickComment.trim()) {
      onAddComment(photo.id, quickComment.trim());
      setQuickComment('');
    }
  };

  const handleQuickCommentSubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quickComment.trim()) {
      onAddComment(photo.id, quickComment.trim());
      setQuickComment('');
    }
  };

  return (
    <div className={`photo-item ${className}`} onClick={onClick}>
      {/* Photo */}
      <img
        src={photo.url}
        alt={photo.name}
        loading="lazy"
        className="w-full h-auto"
      />

      {/* Always visible favorite indicator */}
      <button
        className={`favorite-indicator ${isFavorite ? 'is-favorite' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(photo.id);
        }}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart 
          className={`h-5 w-5 transition-all ${
            isFavorite 
              ? 'fill-current text-white' 
              : 'text-gray-600'
          }`} 
        />
      </button>

      {/* Comment indicator */}
      {commentCount > 0 && (
        <div className="comment-indicator">
          <MessageSquare className="h-3 w-3" />
          {commentCount}
        </div>
      )}

      {/* Hover overlay with quick comment */}
      <div className="photo-overlay">
        <div></div>
        <div className="quick-comment-form">
          <input
            type="text"
            placeholder="Add a comment..."
            value={quickComment}
            onChange={(e) => setQuickComment(e.target.value)}
            onKeyPress={handleQuickComment}
            onClick={(e) => e.stopPropagation()}
            className="quick-comment-input"
          />
          <button
            className="quick-comment-submit"
            onClick={handleQuickCommentSubmit}
            disabled={!quickComment.trim()}
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}