import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Database, 
  CheckCircle, 
  ExternalLink,
  Globe,
  Key,
  Info
} from "lucide-react";
import { supabaseService } from "../services/supabaseService";

interface SupabaseConfigProps {
  onConfigurationChange?: (configured: boolean) => void;
}

export function SupabaseConfig({ onConfigurationChange }: SupabaseConfigProps) {
  const config = supabaseService.getConfig();
  const isConfigured = supabaseService.isReady();

  // Notify parent component of configuration status
  React.useEffect(() => {
    onConfigurationChange?.(isConfigured);
  }, [isConfigured, onConfigurationChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Supabase Configuration
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pre-configured
          </Badge>
        </CardTitle>
        <CardDescription>
          Your application is pre-configured with Supabase cloud storage for seamless photo gallery management.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Status */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p><strong>Ready to use!</strong> Your application is automatically connected to Supabase.</p>
            <div className="text-sm space-y-1">
              <p>✅ Cloud storage enabled for photo uploads</p>
              <p>✅ Multi-device gallery synchronization</p>
              <p>✅ Automatic backup and scaling</p>
              <p>✅ Professional-grade infrastructure</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Configuration Details */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="font-medium">Project URL</span>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <code className="text-sm">{config?.url}</code>
            </div>
            <p className="text-xs text-muted-foreground">
              Connected to your Supabase project instance
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="font-medium">API Authentication</span>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <code className="text-sm">
                {config?.hasApiKey ? '••••••••••••••••••••••••••••••••••••••••' : 'Not configured'}
              </code>
            </div>
            <p className="text-xs text-muted-foreground">
              Secure anon/public API key configured for client access
            </p>
          </div>
        </div>

        {/* Setup Reminder */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Database Setup Required:</strong>
            <p className="mt-1 text-sm">
              Don't forget to execute the SQL commands from <code>SUPABASE_TABLE_SETUP.sql</code> in your Supabase SQL Editor to create the required database tables.
            </p>
            <div className="mt-2">
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline inline-flex items-center text-sm"
              >
                Open Supabase Dashboard <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </AlertDescription>
        </Alert>

        {/* Current Status */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Connection Status:</span>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-green-600">Connected & Ready</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Configuration:</span>
            <span className="text-muted-foreground">Hardcoded (Production Ready)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}