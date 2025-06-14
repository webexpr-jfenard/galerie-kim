import { useState } from "react";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Heart, Trash2, MessageSquare, Save, Edit, X, Expand } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { favoritesService, type FavoritePhoto } from "../services/favoritesService";
import { toast } from "sonner";

interface FavoritePhotoItemProps {
  photo: FavoritePhoto;
  isSelected: boolean;
  onSelectionChange: (photoId: string, selected: boolean) => void;
  onRemoveFromFavorites: (photoId: string) => void;
  onOpenLightbox?: (photoId: string) => void;
}

export function FavoritePhotoItem({ 
  photo, 
  isSelected, 
  onSelectionChange, 
  onRemoveFromFavorites,
  onOpenLightbox
}: FavoritePhotoItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentText, setCommentText] = useState(photo.comment);

  const handleSaveComment = () => {
    favoritesService.updateComment(photo.id, commentText);
    setShowCommentDialog(false);
    toast.success("Comment updated!");
  };

  const handleCancelEdit = () => {
    setCommentText(photo.comment);
    setShowCommentDialog(false);
  };

  const handleRemoveFromFavorites = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveFromFavorites(photo.id);
  };

  const toggleCommentDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentText(photo.comment);
    setShowCommentDialog(true);
  };

  const handleImageClick = () => {
    onOpenLightbox?.(photo.id);
  };

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <div 
        className="group relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleImageClick}
      >
        <ImageWithFallback
          src={photo.thumbnailUrl}
          alt={photo.name}
          className="w-full h-auto object-cover transition-all duration-300 group-hover:brightness-90"
        />
        
        {/* Overlay */}
        <div className={`absolute inset-0 bg-black/0 transition-all duration-300 ${
          isHovered ? 'bg-black/20' : ''
        }`}>
          {/* Top Controls */}
          <div className={`absolute top-3 left-3 right-3 flex justify-between transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}>
            <div onClick={handleCheckboxChange}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => 
                  onSelectionChange(photo.id, checked as boolean)
                }
                className="bg-white/90 backdrop-blur-sm border-white/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-lg"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFromFavorites}
                className="bg-white/90 backdrop-blur-sm hover:bg-red-50 shadow-lg text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick();
                }}
                className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg text-gray-600 hover:text-blue-500"
              >
                <Expand className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className={`absolute bottom-3 left-3 right-3 flex justify-between items-end transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}>
            {/* Favorite Badge */}
            <div className="bg-red-500/90 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm flex items-center gap-1">
              <Heart className="h-3 w-3 fill-current" />
              Favorite
            </div>

            {/* Comment Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCommentDialog}
              className={`bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg transition-all duration-200 ${
                photo.comment ? 'text-blue-600' : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              <MessageSquare className={`h-4 w-4 ${photo.comment ? 'fill-blue-200' : ''}`} />
            </Button>
          </div>

          {/* Permanent Favorite Badge */}
          <div className="absolute top-3 left-3">
            <div className="bg-red-500/90 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm flex items-center gap-1 shadow-lg">
              <Heart className="h-3 w-3 fill-current" />
            </div>
          </div>

          {/* Comment Preview */}
          {photo.comment && !isHovered && (
            <div className="absolute bottom-3 left-3 right-3">
              <div className="bg-black/70 text-white px-2 py-1 rounded text-xs backdrop-blur-sm line-clamp-2">
                {photo.comment}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Edit Comment
            </DialogTitle>
            <DialogDescription>
              Update your comment for this favorite photo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="What do you think about this photo? (optional)"
              className="min-h-24 resize-none"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveComment}>
              <Save className="h-4 w-4 mr-2" />
              Update Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
