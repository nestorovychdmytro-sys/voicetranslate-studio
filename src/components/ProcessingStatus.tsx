import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ProcessingStatusProps {
  progress: number;
}

export const ProcessingStatus = ({ progress }: ProcessingStatusProps) => {
  const getStatusMessage = () => {
    if (progress < 25) return "Estrazione audio in corso...";
    if (progress < 50) return "Trascrizione audio...";
    if (progress < 75) return "Traduzione del testo...";
    if (progress < 100) return "Generazione audio tradotto...";
    return "Completato!";
  };

  return (
    <div className="bg-muted/50 rounded-xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <h3 className="font-semibold">{getStatusMessage()}</h3>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-sm text-muted-foreground mt-2">
        {progress}% completato
      </p>
    </div>
  );
};
