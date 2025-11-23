import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const VideoSizeWarning = () => {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Limitazioni del Browser</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          L'elaborazione video nel browser è <strong>molto lenta</strong> per file di grandi dimensioni.
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm mt-2">
          <li>File sotto 10MB: ~1-2 minuti</li>
          <li>File 10-50MB: ~5-15 minuti</li>
          <li>File sopra 50MB: potrebbero non funzionare</li>
        </ul>
        <p className="text-sm mt-2">
          <strong>Consiglio:</strong> Per video più grandi, estrai l'audio prima con un tool desktop (come VLC o Audacity) e carica solo l'audio.
        </p>
      </AlertDescription>
    </Alert>
  );
};
