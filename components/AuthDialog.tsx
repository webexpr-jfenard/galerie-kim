import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Lock, Eye, EyeOff, Shield, Key } from "lucide-react";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (password: string) => Promise<boolean> | boolean;
  title?: string;
  description?: string;
  type?: 'gallery' | 'admin';
  galleryName?: string;
}

export function AuthDialog({ 
  isOpen, 
  onClose, 
  onAuthenticate, 
  title, 
  description,
  type = 'gallery',
  galleryName 
}: AuthDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const result = await onAuthenticate(password);
      
      if (result) {
        // Success - close dialog and reset form
        setPassword('');
        setError('');
        onClose();
      } else {
        setError('Invalid password. Please try again.');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e as any);
    }
  };

  const resetAndClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  // Get appropriate icon and styling based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'admin':
        return {
          icon: Shield,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          title: title || 'Admin Access Required',
          description: description || 'Enter the admin password to access the management panel.'
        };
      case 'gallery':
      default:
        return {
          icon: Lock,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: title || `Gallery Protected`,
          description: description || `This gallery is password protected. Enter the password to view photos.`
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 ${config.bgColor} rounded-full ${config.borderColor} border`}>
              <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <DialogTitle className="text-lg">
              {config.title}
              {type === 'gallery' && galleryName && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {galleryName}
                </span>
              )}
            </DialogTitle>
          </div>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter password..."
                className="pr-10"
                disabled={isLoading}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetAndClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!password.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Access
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Helper Text */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {type === 'admin' ? (
            <p>Admin access is required to manage galleries and system settings.</p>
          ) : (
            <p>Contact the gallery owner if you need access to this protected gallery.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}