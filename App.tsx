import React, { useState, useEffect } from "react";
import { HomePage } from "./components/HomePage";
import { PhotoGallery } from "./components/PhotoGallery";
import { FavoritesPage } from "./components/FavoritesPage";
import { AdminPanel } from "./components/AdminPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";

// Router utility functions - FIXED ROUTING FOR PAGE REFRESH
const router = {
  // Parse current route from URL - PRIORITY TO HASH ROUTING
  getCurrentRoute: () => {
    try {
      // Always try hash routing first (#/gallery/abc123)
      const hash = window.location.hash;
      if (hash && hash.startsWith('#/')) {
        const route = hash.substring(1); // Remove # to get /gallery/abc123
        console.log('📍 Using hash route:', route);
        return route;
      }
      
      // If no hash but we have a pathname, convert it to hash for consistency
      const pathname = window.location.pathname;
      if (pathname !== '/') {
        console.log('📍 Converting pathname to hash:', pathname);
        // Set hash immediately to avoid future issues
        window.location.hash = pathname;
        return pathname;
      }
      
      console.log('📍 Using home route');
      return '/';
    } catch (error) {
      console.error('Error getting current route:', error);
      return '/';
    }
  },
  
  // Navigate to a route - ALWAYS USE HASH ROUTING
  navigateTo: (path: string) => {
    try {
      console.log('🌐 Navigating to:', path);
      
      if (path === '/') {
        // For home page, clear hash
        window.location.hash = '';
        // Update page title
        document.title = 'Votre Galerie photos｜KR';
      } else {
        // For other routes, always use hash routing (SPA-friendly)
        window.location.hash = path;
        // Update page title based on route
        if (path.startsWith('/gallery/')) {
          document.title = `Galerie ${path.split('/')[2]} - Galerie Photo`;
        } else if (path.startsWith('/favorites/')) {
          document.title = `Sélection ${path.split('/')[2]} - Galerie Photo`;
        } else if (path === '/admin') {
          document.title = 'Administration - Galerie Photo';
        }
      }
      
      // Force route change event
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback: just set hash
      window.location.hash = path === '/' ? '' : path;
    }
  },
  
  // Navigate and force reload - ONLY FOR EMERGENCY CASES
  navigateToAndReload: (path: string) => {
    try {
      console.log('🔄 Navigate with reload to:', path);
      // Use hash routing even for reload
      window.location.hash = path === '/' ? '' : path;
      window.location.reload();
    } catch (error) {
      console.error('Navigate with reload error:', error);
      window.location.reload();
    }
  },
  
  // Go back to home page specifically
  goHome: () => {
    try {
      console.log('🏠 Going home...');
      window.location.hash = '';
      document.title = 'Galerie Photo';
      // Force hash change event
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (error) {
      console.error('Go home error:', error);
      window.location.hash = '';
    }
  },
  
  // Parse gallery ID from route
  getGalleryId: (route: string) => {
    const match = route.match(/^\/gallery\/(.+)$/);
    return match ? match[1] : null;
  },

  // Parse admin route
  isAdminRoute: (route: string) => {
    return route === '/admin';
  },

  // Parse favorites route  
  getFavoritesGalleryId: (route: string) => {
    const match = route.match(/^\/favorites\/(.+)$/);
    return match ? match[1] : null;
  }
};

// Global router instance to share across components
window.appRouter = router;

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [currentRoute, setCurrentRoute] = useState('/');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 Photo Gallery App initializing...');
    
    try {
      // Get initial route and ensure consistent hash routing
      const initialRoute = router.getCurrentRoute();
      console.log('📍 Initial route:', initialRoute);
      setCurrentRoute(initialRoute);
      
      // Ensure URL consistency on page load
      if (initialRoute !== '/' && !window.location.hash) {
        // If we have a route but no hash, set the hash
        window.location.hash = initialRoute;
      }
      
      // Short loading delay for smooth UX
      const timer = setTimeout(() => setIsLoading(false), 300);

      // Handle URL changes - FOCUS ON HASH CHANGES
      const handleRouteChange = (event?: Event) => {
        try {
          const newRoute = router.getCurrentRoute();
          console.log('🔄 Route changed to:', newRoute, 'Event:', event?.type);
          
          // Only update if route actually changed
          setCurrentRoute(prevRoute => {
            if (prevRoute !== newRoute) {
              console.log('✅ Route update:', prevRoute, '->', newRoute);
              setError(null); // Clear any previous errors
              return newRoute;
            }
            return prevRoute;
          });
        } catch (err) {
          console.error('Route change error:', err);
          setError('Navigation error occurred');
        }
      };

      // Listen for hash changes (primary routing method)
      window.addEventListener('hashchange', handleRouteChange);
      // Listen for popstate as backup
      window.addEventListener('popstate', handleRouteChange);
      
      // Handle direct page loads with pathname (redirect to hash)
      if (window.location.pathname !== '/' && !window.location.hash) {
        console.log('🔄 Redirecting pathname to hash routing');
        const pathname = window.location.pathname;
        window.history.replaceState({}, '', '/');
        window.location.hash = pathname;
      }

      return () => {
        clearTimeout(timer);
        window.removeEventListener('hashchange', handleRouteChange);
        window.removeEventListener('popstate', handleRouteChange);
      };
    } catch (err) {
      console.error('App initialization error:', err);
      setError('Failed to initialize application');
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-destructive mb-4">Application Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              window.location.hash = '';
              setCurrentRoute('/');
            }} 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 mr-4"
          >
            Go Home
          </button>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Route parsing and rendering
  const galleryId = router.getGalleryId(currentRoute);
  const favoritesGalleryId = router.getFavoritesGalleryId(currentRoute);
  const isAdmin = router.isAdminRoute(currentRoute);
  
  console.log('🎯 Rendering route:', { 
    currentRoute, 
    galleryId, 
    favoritesGalleryId, 
    isAdmin 
  });

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Route-based component rendering */}
        {galleryId ? (
          <PhotoGallery galleryId={galleryId} />
        ) : favoritesGalleryId ? (
          <FavoritesPage galleryId={favoritesGalleryId} />
        ) : isAdmin ? (
          <AdminPanel />
        ) : (
          <HomePage />
        )}
        
        {/* Global toast notifications */}
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}

// Type declarations for global router
declare global {
  interface Window {
    appRouter: typeof router;
  }
}
