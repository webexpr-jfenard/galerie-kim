import { supabaseService } from './supabaseService';
import { favoritesService } from './favoritesService';
import type { FavoritePhoto, Comment } from './favoritesService';

interface SelectionExport {
  galleryId: string;
  galleryName: string;
  exportDate: string;
  selectedPhotos: {
    photoId: string;
    photoName: string;
    originalName: string;
    url: string;
    comments: string[];
  }[];
  totalSelected: number;
  clientInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

class SelectionService {
  private readonly SELECTIONS_BUCKET = 'photos'; // Bucket pour les sélections exportées

  // Generate selection summary text
  private generateSelectionText(exportData: SelectionExport): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(60));
    lines.push('SÉLECTION CLIENT - GALERIE PHOTO');
    lines.push('='.repeat(60));
    lines.push('');
    
    lines.push(`Galerie: ${exportData.galleryName}`);
    lines.push(`ID Galerie: ${exportData.galleryId}`);
    lines.push(`Date d'export: ${exportData.exportDate}`);
    lines.push(`Total photos sélectionnées: ${exportData.totalSelected}`);
    lines.push('');
    
    if (exportData.clientInfo && (exportData.clientInfo.name || exportData.clientInfo.email)) {
      lines.push('INFORMATIONS CLIENT:');
      lines.push('-'.repeat(30));
      if (exportData.clientInfo.name) lines.push(`Nom: ${exportData.clientInfo.name}`);
      if (exportData.clientInfo.email) lines.push(`Email: ${exportData.clientInfo.email}`);
      if (exportData.clientInfo.phone) lines.push(`Téléphone: ${exportData.clientInfo.phone}`);
      lines.push('');
    }
    
    lines.push('PHOTOS SÉLECTIONNÉES:');
    lines.push('-'.repeat(30));
    
    exportData.selectedPhotos.forEach((photo, index) => {
      lines.push(`${index + 1}. ${photo.originalName || photo.photoName}`);
      lines.push(`   ID: ${photo.photoId}`);
      lines.push(`   URL: ${photo.url}`);
      
      if (photo.comments.length > 0) {
        lines.push('   Commentaires:');
        photo.comments.forEach(comment => {
          lines.push(`   - ${comment}`);
        });
      }
      lines.push('');
    });
    
    lines.push('='.repeat(60));
    lines.push('Fichier généré automatiquement par le système de galerie photo');
    lines.push(`Généré le: ${new Date().toLocaleString('fr-FR')}`);
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  // Export selection to Supabase storage
  async exportSelection(
    galleryId: string,
    galleryName: string,
    clientInfo?: { name?: string; email?: string; phone?: string }
  ): Promise<{ success: boolean; error?: string; fileName?: string; downloadUrl?: string }> {
    try {
      console.log('📋 Exporting selection for gallery:', galleryId);

      // Get selected photos (favorites)
      const favorites = await favoritesService.getFavorites(galleryId);
      
      if (favorites.length === 0) {
        return { success: false, error: 'Aucune photo sélectionnée à exporter' };
      }

      // Get comments
      const comments = await favoritesService.getComments(galleryId);
      
      // Group comments by photo
      const commentsByPhoto: Record<string, string[]> = {};
      comments.forEach(comment => {
        if (!commentsByPhoto[comment.photoId]) {
          commentsByPhoto[comment.photoId] = [];
        }
        commentsByPhoto[comment.photoId].push(comment.text);
      });

      // Prepare export data
      const exportData: SelectionExport = {
        galleryId,
        galleryName,
        exportDate: new Date().toLocaleDateString('fr-FR'),
        selectedPhotos: favorites.map(fav => ({
          photoId: fav.photoId,
          photoName: fav.photoName || 'Photo sans nom',
          originalName: fav.originalName || fav.photoName || 'Photo sans nom',
          url: fav.photoUrl || '',
          comments: commentsByPhoto[fav.photoId] || []
        })),
        totalSelected: favorites.length,
        clientInfo
      };

      // Generate text content
      const textContent = this.generateSelectionText(exportData);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const clientName = clientInfo?.name ? `-${clientInfo.name.replace(/[^a-zA-Z0-9]/g, '')}` : '';
      const fileName = `selection-${galleryId}${clientName}-${timestamp}.txt`;
      const filePath = `${galleryId}/${fileName}`;

      // Upload to Supabase
      const uploadResult = await supabaseService.uploadTextFile(
        this.SELECTIONS_BUCKET,
        filePath,
        textContent,
        { upsert: true }
      );

      if (!uploadResult.success) {
        return { 
          success: false, 
          error: uploadResult.error || 'Échec de l\'upload du fichier de sélection' 
        };
      }

      // Get download URL
      const downloadUrl = supabaseService.getPublicUrl(this.SELECTIONS_BUCKET, filePath);

      console.log('✅ Selection exported successfully:', fileName);
      
      return {
        success: true,
        fileName,
        downloadUrl: downloadUrl || undefined
      };

    } catch (error) {
      console.error('❌ Error exporting selection:', error);
      return { 
        success: false, 
        error: 'Erreur lors de l\'export de la sélection' 
      };
    }
  }

  // Get selection history for a gallery
  async getSelectionHistory(galleryId: string): Promise<{
    success: boolean;
    selections: { name: string; created_at: string; url: string }[];
    error?: string;
  }> {
    try {
      if (!supabaseService.isReady()) {
        return { success: false, selections: [], error: 'Supabase non configuré' };
      }

      const files = await supabaseService.listFiles(this.SELECTIONS_BUCKET, galleryId);
      
      const selections = files
        .filter(file => file.name.endsWith('.txt'))
        .map(file => ({
          name: file.name,
          created_at: file.created_at,
          url: supabaseService.getPublicUrl(this.SELECTIONS_BUCKET, `${galleryId}/${file.name}`) || ''
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return { success: true, selections };
    } catch (error) {
      console.error('Error getting selection history:', error);
      return { 
        success: false, 
        selections: [], 
        error: 'Erreur lors de la récupération de l\'historique' 
      };
    }
  }

  // Quick export without client info
  async quickExportSelection(galleryId: string, galleryName: string): Promise<{ 
    success: boolean; 
    error?: string; 
    fileName?: string;
    downloadUrl?: string;
  }> {
    return await this.exportSelection(galleryId, galleryName);
  }

  // Export with client information form
  async exportSelectionWithClientInfo(
    galleryId: string,
    galleryName: string,
    clientName?: string,
    clientEmail?: string,
    clientPhone?: string
  ): Promise<{ success: boolean; error?: string; fileName?: string; downloadUrl?: string }> {
    const clientInfo = {
      name: clientName?.trim(),
      email: clientEmail?.trim(),
      phone: clientPhone?.trim()
    };

    // Remove empty fields
    Object.keys(clientInfo).forEach(key => {
      if (!clientInfo[key as keyof typeof clientInfo]) {
        delete clientInfo[key as keyof typeof clientInfo];
      }
    });

    return await this.exportSelection(galleryId, galleryName, clientInfo);
  }

  // Generate filename preview
  generateFileName(galleryId: string, clientName?: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const clientPart = clientName ? `-${clientName.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    return `selection-${galleryId}${clientPart}-${timestamp}.txt`;
  }

  // Validate client info
  validateClientInfo(name?: string, email?: string, phone?: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.push('Format d\'email invalide');
      }
    }

    if (phone && phone.trim()) {
      const phoneRegex = /^[\d\s\-\+\(\)\.]{8,}$/;
      if (!phoneRegex.test(phone.trim().replace(/\s/g, ''))) {
        errors.push('Format de téléphone invalide');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const selectionService = new SelectionService();
export type { SelectionExport };