import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate unique filename
    const timestamp = Date.now();
    const videoId = `video_${timestamp}`;
    const inputVideoPath = `/tmp/${videoId}_input.mp4`;
    const inputAudioPath = `/tmp/${videoId}_audio.wav`;
    const outputAudioPath = `/tmp/${videoId}_translated.mp3`;
    const outputVideoPath = `/tmp/${videoId}_output.mp4`;

    // Step 1: Download video
    console.log('Downloading video...');
    await downloadVideo(videoUrl, inputVideoPath, platform);

    // Step 2: Extract audio from video using ffmpeg
    console.log('Extracting audio from video...');
    await extractAudio(inputVideoPath, inputAudioPath);

    // Step 3: Transcribe audio
    console.log('Transcribing audio...');
    const transcriptionResult = await transcribeAudio(inputAudioPath, sourceLanguage);

    // Step 4: Translate text
    console.log('Translating text...');
    const translatedText = await translateText(
      transcriptionResult.text,
      sourceLanguage,
      targetLanguage
    );

    // Step 5: Generate TTS audio
    console.log('Generating translated audio...');
    await generateTTS(translatedText, outputAudioPath, targetLanguage);

    // Step 6: Combine translated audio with original video
    console.log('Combining audio with video...');
    await combineAudioVideo(inputVideoPath, outputAudioPath, outputVideoPath);

    // Step 7: Upload to Supabase Storage
    console.log('Uploading to storage...');
    const outputFileName = `${videoId}_translated.mp4`;
    const videoFile = await Deno.readFile(outputVideoPath);
    
    const { error: uploadError } = await supabase.storage
      .from('translated-videos')
      .upload(outputFileName, videoFile, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('translated-videos')
      .getPublicUrl(outputFileName);

    // Cleanup temporary files
    console.log('Cleaning up temporary files...');
    try {
      await Deno.remove(inputVideoPath);
      await Deno.remove(inputAudioPath);
      await Deno.remove(outputAudioPath);
      await Deno.remove(outputVideoPath);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        originalText: transcriptionResult.text,
        translatedText,
        downloadUrl: publicUrl,
        status: 'completed',
        message: 'Video translation completed successfully.',
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

async function downloadVideo(url: string, outputPath: string, platform: string): Promise<void> {
  if (platform === 'youtube') {
    // Use yt-dlp to download YouTube videos
    const ytDlpCmd = new Deno.Command("yt-dlp", {
      args: [
        "-f", "mp4",
        "-o", outputPath,
        url
      ],
    });
    
    const { success, stderr } = await ytDlpCmd.output();
    if (!success) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`Failed to download video: ${errorText}`);
    }
  } else {
    // For direct URLs, download using fetch
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to download video');
    
    const arrayBuffer = await response.arrayBuffer();
    await Deno.writeFile(outputPath, new Uint8Array(arrayBuffer));
  }
}

async function extractAudio(inputVideo: string, outputAudio: string): Promise<void> {
  const ffmpegCmd = new Deno.Command("ffmpeg", {
    args: [
      "-i", inputVideo,
      "-vn",
      "-acodec", "pcm_s16le",
      "-ar", "24000",
      "-ac", "1",
      outputAudio,
      "-y"
    ],
  });
  
  const { success, stderr } = await ffmpegCmd.output();
  if (!success) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`Failed to extract audio: ${errorText}`);
  }
}

async function combineAudioVideo(inputVideo: string, inputAudio: string, outputVideo: string): Promise<void> {
  const ffmpegCmd = new Deno.Command("ffmpeg", {
    args: [
      "-i", inputVideo,
      "-i", inputAudio,
      "-c:v", "copy",
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-shortest",
      outputVideo,
      "-y"
    ],
  });
  
  const { success, stderr } = await ffmpegCmd.output();
  if (!success) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`Failed to combine audio and video: ${errorText}`);
  }
}

async function transcribeAudio(audioPath: string, language: string): Promise<{ text: string }> {
  console.log('Transcribing audio in language:', language);
  
  // Read audio file
  const audioFile = await Deno.readFile(audioPath);
  
  // Convert to base64
  const base64Audio = btoa(String.fromCharCode(...audioFile));
  
  // Use Lovable AI for transcription
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
      audio: base64Audio,
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

async function generateTTS(text: string, outputPath: string, language: string): Promise<void> {
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
  await Deno.writeFile(outputPath, new Uint8Array(audioData));
  console.log('TTS generation completed');
}
