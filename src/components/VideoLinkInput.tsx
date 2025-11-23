import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Youtube, Twitter, Facebook, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VideoLinkInputProps {
  onSubmit: (data: any) => void;
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
    
    if (!url.trim()) {
      toast({
        title: "URL richiesto",
        description: "Inserisci un URL valido del video",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Funzionalità non disponibile",
      description: "Il download da URL non è supportato a causa delle restrizioni del browser. Scarica il video e caricalo come file.",
      variant: "destructive",
    });
    return;
    
    try {
      toast({
        title: "Download in corso...",
        description: "Sto scaricando il video dalla piattaforma",
      });

      // Import ffmpeg processor
      const { downloadVideoFromUrl, extractAudioFromVideo, combineAudioWithVideo, fileToBase64 } = await import('@/lib/ffmpegProcessor');

      // Download video
      const videoFile = await downloadVideoFromUrl(url);

      toast({
        title: "Estrazione audio...",
        description: "Sto estraendo l'audio dal video",
      });

      // Extract audio
      const audioBlob = await extractAudioFromVideo(videoFile);
      const audioBase64 = await fileToBase64(audioBlob);

      toast({
        title: "Elaborazione AI...",
        description: "Sto trascrivendo e traducendo il contenuto",
      });

      // Process audio with edge function
      const { data, error } = await supabase.functions.invoke('process-video', {
        body: {
          audioBase64,
          sourceLanguage,
          targetLanguage,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Processing failed');

      toast({
        title: "Combinazione video...",
        description: "Sto combinando l'audio tradotto con il video",
      });

      // Combine translated audio with video
      const finalVideoBlob = await combineAudioWithVideo(videoFile, data.translatedAudioBase64);

      // Upload to storage
      const fileName = `video_${Date.now()}_translated.mp4`;
      const { error: uploadError } = await supabase.storage
        .from('translated-videos')
        .upload(fileName, finalVideoBlob, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('translated-videos')
        .getPublicUrl(fileName);

      toast({
        title: "Elaborazione completata!",
        description: "Il tuo video è stato tradotto con successo.",
      });

      onSubmit({
        ...data,
        downloadUrl: publicUrl,
      });
    } catch (error) {
      console.error('Error processing video:', error);
      toast({
        title: "Errore nell'elaborazione",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'elaborazione del video",
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
