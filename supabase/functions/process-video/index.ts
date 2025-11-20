import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, platform, sourceLanguage, targetLanguage, type } = await req.json();

    console.log('Processing video:', { videoUrl, platform, sourceLanguage, targetLanguage, type });

    // Step 1: Download/Extract video (simplified for now - would need yt-dlp for production)
    // For this MVP, we'll return a simulated response
    
    // Step 2: Extract audio from video
    // Would use ffmpeg in production
    
    // Step 3: Transcribe audio using Lovable AI
    const transcriptionResult = await transcribeAudio(sourceLanguage);
    
    // Step 4: Translate text using Lovable AI
    const translatedText = await translateText(
      transcriptionResult.text,
      sourceLanguage,
      targetLanguage
    );

    // Step 5: Generate audio from translated text
    // Would use TTS in production
    
    // Step 6: Combine audio with video
    // Would use ffmpeg in production

    return new Response(
      JSON.stringify({
        success: true,
        originalText: transcriptionResult.text,
        translatedText,
        status: 'processing',
        message: 'Video processing started. This is a demo response.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing video:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function transcribeAudio(language: string): Promise<{ text: string }> {
  // Simulate transcription for demo
  // In production, this would:
  // 1. Use Lovable AI or OpenAI Whisper to transcribe the audio
  // 2. Detect language if set to 'auto'
  
  console.log('Transcribing audio in language:', language);
  
  // Demo response
  return {
    text: "This is a simulated transcription of the video audio. In production, this would be the actual transcribed text from the video.",
  };
}

async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const languageNames: Record<string, string> = {
    'ru': 'Russian',
    'en': 'English',
    'uk': 'Ukrainian',
    'auto': 'detected language',
  };

  const prompt = `Translate the following text from ${languageNames[sourceLanguage] || sourceLanguage} to ${languageNames[targetLanguage] || targetLanguage}. Only return the translation, without any additional commentary or explanation:\n\n${text}`;

  console.log('Translating text with Lovable AI');

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate text accurately while preserving the tone and meaning.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Translation API error:', response.status, errorText);
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices[0].message.content;

    console.log('Translation completed');
    return translatedText;
  } catch (error) {
    console.error('Error during translation:', error);
    throw error;
  }
}
