import { useState } from "react";
import { Upload, Link2, Languages } from "lucide-react";
import { VideoUploader } from "@/components/VideoUploader";
import { VideoLinkInput } from "@/components/VideoLinkInput";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [sourceLanguage, setSourceLanguage] = useState<string>("auto");
  const [targetLanguage, setTargetLanguage] = useState<string>("uk");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);

  const handleProcessingComplete = (data: any) => {
    setResult(data);
    // Simulate progress animation
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => setIsProcessing(false), 500);
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-6 shadow-medium">
            <Languages className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Video Translation AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Traduci automaticamente l'audio dei tuoi video da russo, inglese o ucraino in ucraino o inglese
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl shadow-medium p-8 border border-border">
            {/* Language Selection */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-6">Seleziona le lingue</h2>
              <LanguageSelector
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                onSourceChange={setSourceLanguage}
                onTargetChange={setTargetLanguage}
              />
            </div>

            {/* Video Input Tabs */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-6">Carica il tuo video</h2>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Carica File
                  </TabsTrigger>
                  <TabsTrigger value="link" className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Link Video
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="mt-0">
                  <VideoUploader
                    onUpload={(data) => {
                      setIsProcessing(true);
                      setProgress(0);
                      handleProcessingComplete(data);
                    }}
                    sourceLanguage={sourceLanguage}
                    targetLanguage={targetLanguage}
                  />
                </TabsContent>
                
                <TabsContent value="link" className="mt-0">
                  <VideoLinkInput
                    onSubmit={(data) => {
                      setIsProcessing(true);
                      setProgress(0);
                      handleProcessingComplete(data);
                    }}
                    sourceLanguage={sourceLanguage}
                    targetLanguage={targetLanguage}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Processing Status */}
            {isProcessing && (
              <ProcessingStatus progress={progress} />
            )}

            {/* Results */}
            {result && !isProcessing && (
              <div className="bg-card rounded-2xl shadow-medium p-8 border border-border mt-8">
                <h2 className="text-2xl font-semibold mb-6">Risultati traduzione</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">Testo originale:</h3>
                    <p className="text-foreground bg-muted/30 p-4 rounded-lg">{result.originalText}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">Testo tradotto:</h3>
                    <p className="text-foreground bg-primary/10 p-4 rounded-lg">{result.translatedText}</p>
                  </div>
                  {result.downloadUrl && (
                    <div className="pt-4 border-t border-border">
                      <Button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = result.downloadUrl;
                          link.download = 'translated-video.mp4';
                          link.click();
                        }}
                        size="lg"
                        className="w-full"
                      >
                        <Upload className="w-5 h-5 mr-2 rotate-180" />
                        Scarica video tradotto
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-card rounded-xl p-6 border border-border shadow-soft">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Languages className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Multi-lingua</h3>
              <p className="text-muted-foreground text-sm">
                Supporto per russo, inglese e ucraino come lingue di origine
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-soft">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Flessibile</h3>
              <p className="text-muted-foreground text-sm">
                Carica file o usa link da YouTube, Twitter, Facebook, Instagram
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-soft">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Link2 className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Veloce</h3>
              <p className="text-muted-foreground text-sm">
                Traduzione automatica con AI avanzata in pochi minuti
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
