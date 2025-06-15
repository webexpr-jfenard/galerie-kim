import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner@2.0.3";
import { configureRealAPI } from "../services/storageService";

interface ApiConfigurationProps {
  onConfigurationChange?: () => void;
}

export function ApiConfiguration({ onConfigurationChange }: ApiConfigurationProps) {
  const [useRealAPI, setUseRealAPI] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState({
    url: "https://ugfkyfmthbwqoeauyqlz.supabase.co",
    apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZmt5Zm10aGJ3cW9lYXV5cWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjU0MzksImV4cCI6MjA2NTI0MTQzOX0.0hr_vXm8xjkGytwbY0mR6OPs_9SR6hmiv8ucNSaRJ0U",
    bucket: "photos",
    folder: "gallery"
  });
  const [googleDriveConfig, setGoogleDriveConfig] = useState({
    apiKey: "",
    folderId: ""
  });

  const handleSaveConfiguration = () => {
    if (useRealAPI) {
      // Validate required fields
      if (!supabaseConfig.url || !supabaseConfig.apiKey) {
        toast.error("Please provide Supabase URL and API key to use real API");
        return;
      }
    }

    configureRealAPI({
      useRealAPI,
      supabaseUrl: supabaseConfig.url,
      supabaseApiKey: supabaseConfig.apiKey,
      supabaseBucket: supabaseConfig.bucket,
      supabaseFolder: supabaseConfig.folder,
      googleDriveApiKey: googleDriveConfig.apiKey,
      googleDriveFolderId: googleDriveConfig.folderId
    });

    toast.success(
      useRealAPI 
        ? "Real API configuration saved! Gallery will now fetch from your storage." 
        : "Mock API enabled. Gallery will use sample photos."
    );

    onConfigurationChange?.();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>API Configuration</CardTitle>
        <p className="text-muted-foreground">
          Configure your storage providers to fetch real photos or use mock data for testing.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="use-real-api"
            checked={useRealAPI}
            onCheckedChange={setUseRealAPI}
          />
          <Label htmlFor="use-real-api">
            Use Real API (disable to use mock data)
          </Label>
        </div>

        {useRealAPI && (
          <Tabs defaultValue="supabase" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="supabase">Supabase</TabsTrigger>
              <TabsTrigger value="googledrive">Google Drive</TabsTrigger>
            </TabsList>
            
            <TabsContent value="supabase" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabase-url">Supabase URL *</Label>
                <Input
                  id="supabase-url"
                  placeholder="https://your-project.supabase.co"
                  value={supabaseConfig.url}
                  onChange={(e) => setSupabaseConfig(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase-key">Supabase Anon Key *</Label>
                <Input
                  id="supabase-key"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseConfig.apiKey}
                  onChange={(e) => setSupabaseConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase-bucket">Storage Bucket</Label>
                <Input
                  id="supabase-bucket"
                  placeholder="photos"
                  value={supabaseConfig.bucket}
                  onChange={(e) => setSupabaseConfig(prev => ({ ...prev, bucket: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase-folder">Folder Path</Label>
                <Input
                  id="supabase-folder"
                  placeholder="gallery"
                  value={supabaseConfig.folder}
                  onChange={(e) => setSupabaseConfig(prev => ({ ...prev, folder: e.target.value }))}
                />
              </div>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Setup Instructions:</strong></p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Install Supabase client: <code>npm install @supabase/supabase-js</code></li>
                  <li>Create a storage bucket in your Supabase dashboard</li>
                  <li>Upload photos to your bucket/folder</li>
                  <li>Make sure your bucket has public access for photo URLs</li>
                </ol>
              </div>
            </TabsContent>
            
            <TabsContent value="googledrive" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="drive-key">Google Drive API Key</Label>
                <Input
                  id="drive-key"
                  type="password"
                  placeholder="AIzaSyC..."
                  value={googleDriveConfig.apiKey}
                  onChange={(e) => setGoogleDriveConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drive-folder">Folder ID</Label>
                <Input
                  id="drive-folder"
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={googleDriveConfig.folderId}
                  onChange={(e) => setGoogleDriveConfig(prev => ({ ...prev, folderId: e.target.value }))}
                />
              </div>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Setup Instructions:</strong></p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Create a project in Google Cloud Console</li>
                  <li>Enable the Google Drive API</li>
                  <li>Create an API key with Drive API access</li>
                  <li>Make your Drive folder publicly accessible</li>
                  <li>Copy the folder ID from the Drive URL</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <Button onClick={handleSaveConfiguration} className="w-full">
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}