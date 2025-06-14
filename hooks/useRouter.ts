import { useState, useEffect, useCallback } from 'react';

export type Route = {
  path: string;
  type: 'home' | 'gallery' | 'admin';
  galleryId?: string;
};

const DEBUG_ROUTING = false; // Set to true for debugging

const defaultRoute: Route = { path: '/', type: 'home' };

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>(defaultRoute);
  const [isInitialized, setIsInitialized] = useState(false);

  const log = useCallback((message: string, data?: any) => {
    if (DEBUG_ROUTING) {
      console.log(`🌐 Router: ${message}`, data || '');
    }
  }, []);

  const parseRoute = useCallback((path: string): Route => {
    try {
      log('Parsing route', { path });
      
      // Ensure path is a string
      if (typeof path !== 'string') {
        log('Invalid path type, defaulting to home');
        return defaultRoute;
      }
      
      // Clean the path
      const cleanPath = path.replace(/\/+$/, '') || '/';
      log('Cleaned path', { cleanPath });
      
      // Check for gallery route
      const galleryMatch = cleanPath.match(/^\/gallery\/([^\/]+)$/);
      if (galleryMatch && galleryMatch[1]) {
        const galleryId = galleryMatch[1];
        log('Gallery route detected', { galleryId });
        return {
          path: cleanPath,
          type: 'gallery',
          galleryId
        };
      }

      // Check for admin route
      if (cleanPath === '/admin') {
        log('Admin route detected');
        return {
          path: cleanPath,
          type: 'admin'
        };
      }

      // Default to home
      log('Home route (default)');
      return {
        path: '/',
        type: 'home'
      };
    } catch (error) {
      console.error('Error parsing route:', error);
      return defaultRoute;
    }
  }, [log]);

  const updateRoute = useCallback(() => {
    try {
      const path = window?.location?.pathname || '/';
      log('Updating route from window location', { path });
      
      const route = parseRoute(path);
      log('Route parsed', route);
      
      setCurrentRoute(route);
    } catch (error) {
      console.error('Error updating route:', error);
      setCurrentRoute(defaultRoute);
    }
  }, [parseRoute, log]);

  const navigateTo = useCallback((path: string) => {
    try {
      if (typeof path !== 'string') {
        console.error('Invalid path provided to navigateTo:', path);
        return;
      }

      log('Navigating to', { path });
      
      const route = parseRoute(path);
      
      // Update browser history only if different
      if (window?.location?.pathname !== path) {
        window.history.pushState({}, '', path);
        log('History updated');
      }
      
      setCurrentRoute(route);
    } catch (error) {
      console.error('Error navigating:', error);
    }
  }, [parseRoute, log]);

  const navigateToGallery = useCallback((galleryId: string) => {
    if (!galleryId || typeof galleryId !== 'string') {
      console.error('Invalid galleryId provided:', galleryId);
      return;
    }
    
    const path = `/gallery/${galleryId}`;
    log('Navigating to gallery', { galleryId, path });
    navigateTo(path);
  }, [navigateTo, log]);

  const navigateToHome = useCallback(() => {
    log('Navigating to home');
    navigateTo('/');
  }, [navigateTo, log]);

  const navigateToAdmin = useCallback(() => {
    log('Navigating to admin');
    navigateTo('/admin');
  }, [navigateTo, log]);

  // Get current URL parameters safely
  const getCurrentGalleryId = useCallback((): string | null => {
    try {
      if (currentRoute.type === 'gallery' && currentRoute.galleryId) {
        return currentRoute.galleryId;
      }
      return null;
    } catch (error) {
      console.error('Error getting current gallery ID:', error);
      return null;
    }
  }, [currentRoute]);

  // Force refresh route (useful for debugging)
  const refreshRoute = useCallback(() => {
    log('Force refreshing route');
    updateRoute();
  }, [updateRoute, log]);

  useEffect(() => {
    try {
      log('Router initializing');
      
      // Initial route parsing
      updateRoute();
      setIsInitialized(true);

      // Listen for browser back/forward
      const handlePopState = (event: PopStateEvent) => {
        try {
          log('Popstate event', { event });
          updateRoute();
        } catch (error) {
          console.error('Error handling popstate:', error);
        }
      };

      // Listen for manual URL changes (for testing)
      const handleLocationChange = () => {
        try {
          log('Location change detected');
          updateRoute();
        } catch (error) {
          console.error('Error handling location change:', error);
        }
      };

      window.addEventListener('popstate', handlePopState);
      window.addEventListener('locationchange', handleLocationChange);

      return () => {
        try {
          log('Router cleanup');
          window.removeEventListener('popstate', handlePopState);
          window.removeEventListener('locationchange', handleLocationChange);
        } catch (error) {
          console.error('Error during router cleanup:', error);
        }
      };
    } catch (error) {
      console.error('Error initializing router:', error);
      setIsInitialized(true); // Still mark as initialized to prevent infinite loading
    }
  }, [updateRoute, log]);

  // Log route changes
  useEffect(() => {
    if (isInitialized) {
      log('Route changed', currentRoute);
    }
  }, [currentRoute, isInitialized, log]);

  return {
    currentRoute,
    navigateTo,
    navigateToGallery,
    navigateToHome,
    navigateToAdmin,
    updateRoute,
    refreshRoute,
    getCurrentGalleryId,
    isInitialized
  };
}

// Helper function to manually trigger location change event
export const triggerLocationChange = () => {
  try {
    window.dispatchEvent(new Event('locationchange'));
  } catch (error) {
    console.error('Error triggering location change:', error);
  }
};