import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Youtube, Twitter, Facebook, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VideoLinkInputProps {
  onSubmit: (url: string) => void;
  sourceLanguage: string;
  targetLanguage: string;
}

export const VideoLinkInput = ({ onSubmit, sourceLanguage, targetLanguage }: VideoLinkInputProps) => {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const detectPlatform = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    return 'unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast({
        title: "Errore",
        description: "Inserisci un URL valido",
        variant: "destructive",
      });
      return;
    }

    const platform = detectPlatform(url);
    if (platform === 'unknown') {
      toast({
        title: "Piattaforma non supportata",
        description: "Supportiamo solo YouTube, Twitter, Facebook e Instagram",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-video', {
        body: {
          videoUrl: url,
          platform,
          sourceLanguage,
          targetLanguage,
          type: 'link'
        }
      });

      if (error) throw error;

      toast({
        title: "Video in elaborazione!",
        description: "Stiamo scaricando e traducendo il video...",
      });
      
      onSubmit(url);
    } catch (error) {
      console.error('Error processing video:', error);
      toast({
        title: "Errore",
        description: "Impossibile elaborare il video. Verifica l'URL.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          type="url"
          placeholder="https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12"
        />
        <div className="flex gap-2 items-center justify-center text-sm text-muted-foreground">
          <span>Piattaforme supportate:</span>
          <Youtube className="w-4 h-4" />
          <Twitter className="w-4 h-4" />
          <Facebook className="w-4 h-4" />
          <Instagram className="w-4 h-4" />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isProcessing || !url}
        className="w-full"
        size="lg"
      >
        {isProcessing ? "Elaborazione in corso..." : "Avvia traduzione"}
      </Button>
    </form>
  );
};
