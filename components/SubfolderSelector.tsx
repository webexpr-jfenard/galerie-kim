import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  Folder, 
  FolderPlus, 
  X,
  Check
} from "lucide-react";
import { galleryService, SubfolderInfo } from "../services/galleryService";

interface SubfolderSelectorProps {
  galleryId: string;
  selectedSubfolder?: string;
  onSubfolderChange: (subfolder: string | undefined) => void;
  disabled?: boolean;
}

export function SubfolderSelector({ 
  galleryId, 
  selectedSubfolder, 
  onSubfolderChange,
  disabled = false
}: SubfolderSelectorProps) {
  const [subfolders, setSubfolders] = useState<SubfolderInfo[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load existing subfolders
  useEffect(() => {
    loadSubfolders();
  }, [galleryId]);

  const loadSubfolders = async () => {
    setIsLoading(true);
    try {
      const folderList = await galleryService.getGallerySubfolders(galleryId);
      setSubfolders(folderList);
    } catch (error) {
      console.error('Error loading subfolders:', error);
      // Don't show error to user since this is often due to missing database setup
      setSubfolders([]); // Fallback to empty array
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSubfolder = () => {
    const trimmedName = newSubfolderName.trim();
    
    if (!trimmedName) {
      return;
    }

    // Validate subfolder name
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
      alert('Le nom du dossier ne peut contenir que des lettres, chiffres, espaces, tirets et underscores.');
      return;
    }

    // Check if subfolder already exists
    if (subfolders.some(sf => sf.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('Ce sous-dossier existe déjà.');
      return;
    }

    // Add to list and select it
    const newSubfolder: SubfolderInfo = {
      name: trimmedName,
      photoCount: 0,
      lastUpdated: new Date().toISOString()
    };
    
    setSubfolders(prev => [...prev, newSubfolder].sort((a, b) => a.name.localeCompare(b.name)));
    onSubfolderChange(trimmedName);
    setNewSubfolderName('');
    setIsCreatingNew(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateNewSubfolder();
    } else if (e.key === 'Escape') {
      setIsCreatingNew(false);
      setNewSubfolderName('');
    }
  };

  const handleSelectChange = (value: string) => {
    // Handle the special "root" value vs real subfolder names
    if (value === "ROOT_FOLDER") {
      onSubfolderChange(undefined);
    } else {
      onSubfolderChange(value);
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="subfolder-select" className="text-sm font-medium">
        Sous-dossier (optionnel)
      </Label>
      
      <div className="space-y-2">
        {/* Existing subfolders selection */}
        <Select
          value={selectedSubfolder || "ROOT_FOLDER"}
          onValueChange={handleSelectChange}
          disabled={disabled || isLoading}
        >
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Choisir un sous-dossier existant ou créer un nouveau..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            {/* Root folder option - use special value to avoid empty string */}
            <SelectItem value="ROOT_FOLDER">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Racine (pas de sous-dossier)
              </div>
            </SelectItem>
            
            {/* Existing subfolders */}
            {subfolders.map((subfolder) => (
              <SelectItem key={subfolder.name} value={subfolder.name}>
                <div className="flex items-center justify-between w-full bg-white">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-blue-500" />
                    <span>{subfolder.name}</span>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {subfolder.photoCount}
                  </Badge>
                </div>
              </SelectItem>
            ))}
            
            {/* Show loading state */}
            {isLoading && (
              <SelectItem value="LOADING" disabled>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
                  Chargement...
                </div>
              </SelectItem>
            )}
            
            {/* Show when no subfolders exist */}
            {!isLoading && subfolders.length === 0 && (
              <SelectItem value="NO_SUBFOLDERS" disabled>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Folder className="h-4 w-4" />
                  Aucun sous-dossier existant
                </div>
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* Create new subfolder */}
        {!isCreatingNew ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingNew(true)}
            disabled={disabled}
            className="w-full"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Créer un nouveau sous-dossier
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Nom du nouveau sous-dossier..."
                value={newSubfolderName}
                onChange={(e) => setNewSubfolderName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="text-sm"
                autoFocus
                maxLength={50}
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateNewSubfolder}
              disabled={!newSubfolderName.trim()}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreatingNew(false);
                setNewSubfolderName('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Current selection display */}
        {selectedSubfolder && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <Folder className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Sélectionné: <strong>{selectedSubfolder}</strong>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSubfolderChange(undefined)}
              className="ml-auto h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Helper text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            Les sous-dossiers permettent d'organiser vos photos par thème, date ou catégorie.
            {subfolders.length > 0 && ` Vous avez ${subfolders.length} sous-dossier${subfolders.length !== 1 ? 's' : ''} existant${subfolders.length !== 1 ? 's' : ''}.`}
          </p>
          {!galleryService.isSupabaseConfigured() && (
            <p className="text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠️ La gestion des sous-dossiers nécessite Supabase. Configurez-le dans le panneau d'administration.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
