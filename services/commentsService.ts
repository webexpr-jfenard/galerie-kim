export interface PhotoComment {
  photoId: string;
  comment: string;
  dateAdded: string;
  dateUpdated: string;
}

class CommentsService {
  private comments: Map<string, PhotoComment> = new Map();
  private storageKey = 'photo-gallery-comments';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const commentsArray: PhotoComment[] = JSON.parse(stored);
        this.comments = new Map(commentsArray.map(comment => [comment.photoId, comment]));
      }
    } catch (error) {
      console.error('Error loading comments from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      const commentsArray = Array.from(this.comments.values());
      localStorage.setItem(this.storageKey, JSON.stringify(commentsArray));
    } catch (error) {
      console.error('Error saving comments to storage:', error);
    }
  }

  addComment(photoId: string, comment: string): void {
    const now = new Date().toISOString();
    const photoComment: PhotoComment = {
      photoId,
      comment,
      dateAdded: now,
      dateUpdated: now
    };
    
    this.comments.set(photoId, photoComment);
    this.saveToStorage();
  }

  updateComment(photoId: string, comment: string): void {
    const existing = this.comments.get(photoId);
    if (existing) {
      existing.comment = comment;
      existing.dateUpdated = new Date().toISOString();
      this.saveToStorage();
    } else {
      this.addComment(photoId, comment);
    }
  }

  removeComment(photoId: string): void {
    this.comments.delete(photoId);
    this.saveToStorage();
  }

  getComment(photoId: string): PhotoComment | undefined {
    return this.comments.get(photoId);
  }

  hasComment(photoId: string): boolean {
    return this.comments.has(photoId);
  }

  getAllComments(): PhotoComment[] {
    return Array.from(this.comments.values()).sort(
      (a, b) => new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime()
    );
  }

  clearAllComments(): void {
    this.comments.clear();
    this.saveToStorage();
  }
}

export const commentsService = new CommentsService();