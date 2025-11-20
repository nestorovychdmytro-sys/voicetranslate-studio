import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

interface LanguageSelectorProps {
  sourceLanguage: string;
  targetLanguage: string;
  onSourceChange: (value: string) => void;
  onTargetChange: (value: string) => void;
}

export const LanguageSelector = ({
  sourceLanguage,
  targetLanguage,
  onSourceChange,
  onTargetChange,
}: LanguageSelectorProps) => {
  const sourceLanguages = [
    { value: "auto", label: "Rilevamento automatico" },
    { value: "ru", label: "Russo" },
    { value: "en", label: "Inglese" },
    { value: "uk", label: "Ucraino" },
  ];

  const targetLanguages = [
    { value: "uk", label: "Ucraino" },
    { value: "en", label: "Inglese" },
  ];

  return (
    <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
      <div className="space-y-2">
        <Label htmlFor="source-lang">Lingua originale</Label>
        <Select value={sourceLanguage} onValueChange={onSourceChange}>
          <SelectTrigger id="source-lang">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sourceLanguages.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden md:flex items-center justify-center pb-2">
        <ArrowRight className="w-6 h-6 text-primary" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="target-lang">Lingua di destinazione</Label>
        <Select value={targetLanguage} onValueChange={onTargetChange}>
          <SelectTrigger id="target-lang">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {targetLanguages.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
