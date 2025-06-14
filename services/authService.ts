interface AdminSession {
  isAuthenticated: boolean;
  timestamp: number;
  expiresAt: number;
}

class AuthService {
  private readonly ADMIN_PASSWORD = 'admin123'; // Change this to your desired password
  private readonly ADMIN_SESSION_KEY = 'admin-session';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Admin Authentication
  authenticateAdmin(password: string): boolean {
    try {
      const isValid = password === this.ADMIN_PASSWORD;
      
      if (isValid) {
        this.setAdminSession();
      }
      
      return isValid;
    } catch (error) {
      console.error('Error authenticating admin:', error);
      return false;
    }
  }

  isAdminAuthenticated(): boolean {
    try {
      const session = this.getAdminSession();
      if (!session) return false;
      
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        this.clearAdminSession();
        return false;
      }
      
      return session.isAuthenticated;
    } catch (error) {
      console.error('Error checking admin auth:', error);
      return false;
    }
  }

  private setAdminSession(): void {
    try {
      const session: AdminSession = {
        isAuthenticated: true,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.SESSION_DURATION
      };
      
      localStorage.setItem(this.ADMIN_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error setting admin session:', error);
    }
  }

  private getAdminSession(): AdminSession | null {
    try {
      const stored = localStorage.getItem(this.ADMIN_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting admin session:', error);
      return null;
    }
  }

  clearAdminSession(): void {
    try {
      localStorage.removeItem(this.ADMIN_SESSION_KEY);
    } catch (error) {
      console.error('Error clearing admin session:', error);
    }
  }

  getSessionInfo(): { isAuthenticated: boolean; expiresAt?: number; timeRemaining?: number } {
    try {
      const session = this.getAdminSession();
      if (!session) {
        return { isAuthenticated: false };
      }

      const timeRemaining = session.expiresAt - Date.now();
      
      return {
        isAuthenticated: session.isAuthenticated && timeRemaining > 0,
        expiresAt: session.expiresAt,
        timeRemaining: Math.max(0, timeRemaining)
      };
    } catch (error) {
      return { isAuthenticated: false };
    }
  }

  extendSession(): boolean {
    try {
      if (!this.isAdminAuthenticated()) return false;
      
      this.setAdminSession(); // Refresh the session
      return true;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }

  // Password validation helper
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!password || password.length === 0) {
      errors.push('Password is required');
    }
    
    if (password.length < 4) {
      errors.push('Password must be at least 4 characters long');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Change admin password (requires current password)
  changeAdminPassword(currentPassword: string, newPassword: string): boolean {
    try {
      // Verify current password
      if (currentPassword !== this.ADMIN_PASSWORD) {
        return false;
      }

      // Validate new password
      const validation = AuthService.validatePassword(newPassword);
      if (!validation.isValid) {
        return false;
      }

      // Note: In a real implementation, you would update the password in a secure way
      // For this demo, we would need to modify the ADMIN_PASSWORD constant
      console.warn('Password change requested. Update ADMIN_PASSWORD constant in authService.ts');
      
      return true;
    } catch (error) {
      console.error('Error changing admin password:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
export type { AdminSession };