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
    const { audioBase64, sourceLanguage, targetLanguage } = await req.json();
    console.log('Processing audio:', { sourceLanguage, targetLanguage });

    if (!audioBase64) {
      throw new Error('No audio data provided');
    }

    // Step 1: Transcribe audio
    console.log('Transcribing audio...');
    const transcriptionResult = await transcribeAudio(audioBase64, sourceLanguage);

    // Step 2: Translate text
    console.log('Translating text...');
    const translatedText = await translateText(
      transcriptionResult.text,
      sourceLanguage,
      targetLanguage
    );

    // Step 3: Generate TTS audio
    console.log('Generating translated audio...');
    const ttsAudioBase64 = await generateTTS(translatedText, targetLanguage);

    return new Response(
      JSON.stringify({
        success: true,
        originalText: transcriptionResult.text,
        translatedText,
        translatedAudioBase64: ttsAudioBase64,
        status: 'completed',
        message: 'Audio translation completed successfully.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing audio:', error);
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

async function transcribeAudio(audioBase64: string, language: string): Promise<{ text: string }> {
  console.log('Transcribing audio in language:', language);
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: audioBase64,
      model: 'whisper-1',
      language: language === 'auto' ? undefined : language,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Transcription error:', response.status, errorText);
    throw new Error(`Transcription failed: ${response.status}`);
  }

  const data = await response.json();
  return { text: data.text };
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

async function generateTTS(text: string, language: string): Promise<string> {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  // Map languages to appropriate ElevenLabs voices
  const voiceMap: Record<string, string> = {
    'en': '9BWtsMINqrJLrRacOk9x', // Aria
    'uk': 'EXAVITQu4vr4xnSDxMaL', // Sarah
    'ru': 'pFZP5JQG7iQjIQuC4Bku', // Lily
  };

  const voiceId = voiceMap[language] || voiceMap['en'];

  console.log(`Generating TTS for language ${language} with voice ${voiceId}`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('TTS error:', response.status, errorText);
    throw new Error(`TTS generation failed: ${response.status}`);
  }

  const audioData = await response.arrayBuffer();
  const uint8Array = new Uint8Array(audioData);
  
  // Convert to base64
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  console.log('TTS generation completed');
  return btoa(binary);
}
