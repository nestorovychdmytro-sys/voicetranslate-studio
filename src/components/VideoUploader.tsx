import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VideoUploaderProps {
  onUpload: (data: any) => void;
  sourceLanguage: string;
  targetLanguage: string;
}

export const VideoUploader = ({ onUpload, sourceLanguage, targetLanguage }: VideoUploaderProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      toast({
        title: "Estrazione audio...",
        description: "Sto estraendo l'audio dal video",
      });

      // Import ffmpeg processor
      const { extractAudioFromVideo, combineAudioWithVideo, fileToBase64 } = await import('@/lib/ffmpegProcessor');

      // Extract audio
      const audioBlob = await extractAudioFromVideo(selectedFile);
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
      const finalVideoBlob = await combineAudioWithVideo(selectedFile, data.translatedAudioBase64);

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
        description: "Il tuo video è stato caricato e tradotto con successo.",
      });

      onUpload({
        ...data,
        downloadUrl: publicUrl,
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: "Errore nell'elaborazione",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'elaborazione del video",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          {selectedFile ? (
            <>
              <FileVideo className="w-12 h-12 text-primary" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {isDragActive
                    ? "Rilascia il video qui"
                    : "Trascina un video qui o clicca per selezionare"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Formati supportati: MP4, MOV, AVI, MKV, WEBM
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedFile && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full"
          size="lg"
        >
          {isUploading ? "Caricamento in corso..." : "Avvia traduzione"}
        </Button>
      )}
    </div>
  );
};
