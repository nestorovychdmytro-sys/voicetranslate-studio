import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

export const loadFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
};

export const extractAudioFromVideo = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await loadFFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress(Math.round(progress * 100));
    }
  });

  // Write video to FFmpeg file system
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

  // Extract audio as WAV
  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vn',
    '-acodec', 'pcm_s16le',
    '-ar', '24000',
    '-ac', '1',
    'output.wav'
  ]);

  // Read the output audio file
  const data = await ffmpeg.readFile('output.wav');
  
  // Clean up
  await ffmpeg.deleteFile('input.mp4');
  await ffmpeg.deleteFile('output.wav');

  // Ensure data is Uint8Array and convert to regular ArrayBuffer
  const uint8Data = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(0);
  return new Blob([uint8Data], { type: 'audio/wav' });
};

export const combineAudioWithVideo = async (
  videoFile: File,
  audioBase64: string,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await loadFFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress(Math.round(progress * 100));
    }
  });

  // Convert base64 to blob
  const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');

  // Write files to FFmpeg file system
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
  await ffmpeg.writeFile('audio.mp3', await fetchFile(audioBlob));

  // Combine video with new audio
  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-i', 'audio.mp3',
    '-c:v', 'copy',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-shortest',
    'output.mp4'
  ]);

  // Read the output video file
  const data = await ffmpeg.readFile('output.mp4');
  
  // Clean up
  await ffmpeg.deleteFile('input.mp4');
  await ffmpeg.deleteFile('audio.mp3');
  await ffmpeg.deleteFile('output.mp4');

  // Ensure data is Uint8Array and convert to regular ArrayBuffer
  const uint8Data = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(0);
  return new Blob([uint8Data], { type: 'video/mp4' });
};

export const downloadVideoFromUrl = async (url: string): Promise<File> => {
  throw new Error('Direct URL downloads are not supported due to browser CORS restrictions. Please download the video first and upload it as a file.');
};

const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

export const fileToBase64 = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
