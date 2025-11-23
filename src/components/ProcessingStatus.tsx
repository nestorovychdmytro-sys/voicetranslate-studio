import { Progress } from "@/components/ui/progress";
import { Loader2, Clock } from "lucide-react";

interface ProcessingStatusProps {
  progress: number;
  stage: string;
  estimatedTimeRemaining?: number;
}

export const ProcessingStatus = ({ progress, stage, estimatedTimeRemaining }: ProcessingStatusProps) => {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-6 border border-primary/20 shadow-soft animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <h3 className="font-semibold text-foreground">{stage}</h3>
        </div>
        {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formatTime(estimatedTimeRemaining)} rimanenti</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <Progress value={progress} className="h-3 shadow-inner" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{progress}% completato</span>
          <span className="font-medium text-primary">{Math.round(progress)}%</span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="grid grid-cols-4 gap-2 text-xs text-center">
          <div className={`p-2 rounded ${progress >= 25 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            Estrazione
          </div>
          <div className={`p-2 rounded ${progress >= 50 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            Trascrizione
          </div>
          <div className={`p-2 rounded ${progress >= 75 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            Traduzione
          </div>
          <div className={`p-2 rounded ${progress >= 100 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            Finalizzazione
          </div>
        </div>
      </div>
    </div>
  );
};
