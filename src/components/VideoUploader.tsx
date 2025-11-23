import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VideoSizeWarning } from "@/components/VideoSizeWarning";

interface VideoUploaderProps {
  onUpload: (data: any) => void;
  sourceLanguage: string;
  targetLanguage: string;
  onProgress?: (progress: number, stage: string, estimatedTime?: number) => void;
}

export const VideoUploader = ({ onUpload, sourceLanguage, targetLanguage, onProgress }: VideoUploaderProps) => {
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
      const startTime = Date.now();
      
      // Stage 1: Audio Extraction (0-20%)
      onProgress?.(5, "Estrazione audio dal video", 90);
      toast({
        title: "Estrazione audio...",
        description: "Sto estraendo l'audio dal video",
      });

      const { extractAudioFromVideo, combineAudioWithVideo, fileToBase64 } = await import('@/lib/ffmpegProcessor');

      const audioBlob = await extractAudioFromVideo(selectedFile, (extractProgress) => {
        const overallProgress = 5 + (extractProgress / 100) * 15;
        const elapsed = (Date.now() - startTime) / 1000;
        const estimated = (elapsed / overallProgress) * (100 - overallProgress);
        onProgress?.(Math.round(overallProgress), "Estrazione audio dal video", Math.round(estimated));
      });
      
      onProgress?.(20, "Preparazione audio per AI", 70);
      const audioBase64 = await fileToBase64(audioBlob);

      // Stage 2: AI Processing (20-80%)
      onProgress?.(25, "Trascrizione audio con AI", 60);
      toast({
        title: "Elaborazione AI...",
        description: "Sto trascrivendo e traducendo il contenuto",
      });

      const { data, error } = await supabase.functions.invoke('process-video', {
        body: {
          audioBase64,
          sourceLanguage,
          targetLanguage,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Processing failed');

      onProgress?.(80, "Generazione audio completata", 20);

      // Stage 3: Video Combination (80-95%)
      onProgress?.(82, "Combinazione audio tradotto con video", 15);
      toast({
        title: "Combinazione video...",
        description: "Sto combinando l'audio tradotto con il video",
      });

      const finalVideoBlob = await combineAudioWithVideo(selectedFile, data.translatedAudioBase64, (combineProgress) => {
        const overallProgress = 82 + (combineProgress / 100) * 13;
        const elapsed = (Date.now() - startTime) / 1000;
        const estimated = (elapsed / overallProgress) * (100 - overallProgress);
        onProgress?.(Math.round(overallProgress), "Combinazione audio tradotto con video", Math.round(estimated));
      });

      // Stage 4: Upload (95-100%)
      onProgress?.(95, "Caricamento video finale", 5);
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

      onProgress?.(100, "Completato!", 0);
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
      {selectedFile && selectedFile.size > 10 * 1024 * 1024 && <VideoSizeWarning />}
      
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
