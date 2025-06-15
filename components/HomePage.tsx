import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Camera, ArrowRight, Shield, Image } from "lucide-react";

export function HomePage() {
  const [galleryId, setGalleryId] = useState('');

  const handleGalleryAccess = () => {
    if (!galleryId.trim()) {
      return;
    }
    
    // Navigate to gallery
    window.appRouter.navigateTo(`/gallery/${galleryId.trim()}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGalleryAccess();
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Discreet Admin Button - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.appRouter.navigateTo('/admin')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Shield className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content - Centered */}
      <div className="flex items-center justify-center min-h-screen p-4 bg-[rgba(255,255,255,1)]">
        <div className="w-full max-w-md text-center space-y-8">
          {/* Logo/Brand */}
          <div className="space-y-4">
            <div className="w-20 h-20  rounded-full flex items-center justify-center mx-auto">
             
<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215.29 215.93">
  <g id="Layer_1-2" data-name="Layer 1">
    <g>
      <path d="M96.09.47c88.31-7.93,148.52,85.13,104.37,162.37-41.55,72.68-148.39,70.05-187.69-3.65C-22.95,92.21,19.9,7.32,96.09.47ZM103.08,3.47C21.81,6.35-23.51,98.39,20.88,166.08c42.07,64.15,139.4,61.21,176.93-5.89C237.79,88.7,185.17.57,103.08,3.47Z"/>
      <path d="M71.29,48.17v42l38.45-41.05,11.55-.93-38.92,40.63,27.92,32.36v-41c0-1.46,26.97-1.05,29.24-.74,21.84,2.98,31.63,29.87,13.79,44.26l-10.02,5.96,29.99,40.51h-14.5c-2.36,0-23.71-34.12-27.93-38.07l-7.57-.93v39c0,.65-13,.65-13,0v-30.5c0-2.91-35.26-37.02-38.51-43.49-3.06-.26-.49,1.08-.49,1.49v42.5c0,.65-13,.65-13,0V48.17c0-.65,11.61.48,13,0ZM123.29,86.17c-1.3,1.28,0,31.57,0,36.5,0,.21-1.49,1.13-1,1.49.43.31,9.06.2,10.54.05,23.13-2.36,20.89-33.02,4.73-36.81-1.4-.33-13.76-1.73-14.27-1.23Z"/>
    </g>
  </g>
</svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Votre galerie photos</h1>
              <p className="text-muted-foreground">
                Entrer votre ID de galerie transmis pour accéder à vos photos et commencer votre sélection.
              </p>
            </div>
          </div>

          {/* Gallery Access Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Entrer l'ID de Galerie"
                value={galleryId}
                onChange={(e) => setGalleryId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-center text-lg py-3 px-4"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                ID de galerie fourni par Kim Redler
              </p>
            </div>
            
            <Button
              onClick={handleGalleryAccess}
              disabled={!galleryId.trim()}
              size="lg"
              className="w-full"
            >
              <Image className="h-5 w-5 mr-2" />
              Accéder à ma galerie
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>

          {/* Help Section */}
          <div className="pt-8 border-t">
            <div className="text-center space-y-3">
              <h3 className="font-semibold text-sm">Need Help?</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <a href="mailto:contact@kimredler.com">contact@kimredler.com</a>
               
              
              </div>
            </div>
          </div>

          {/* Footer */}
         
        </div>
      </div>
    </div>
  );
}
