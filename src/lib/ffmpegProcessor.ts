import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

export const loadFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  console.log('Loading FFmpeg.wasm...');
  const ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    console.log('FFmpeg:', message);
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  console.log('Loading FFmpeg core files...');
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  console.log('FFmpeg loaded successfully');
  ffmpegInstance = ffmpeg;
  return ffmpeg;
};

export const extractAudioFromVideo = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  console.log('Starting audio extraction for file:', videoFile.name, 'Size:', (videoFile.size / 1024 / 1024).toFixed(2), 'MB');
  
  // Warn if file is large
  if (videoFile.size > 50 * 1024 * 1024) {
    console.warn('Warning: Large video file detected. Processing may be very slow or fail.');
  }

  const ffmpeg = await loadFFmpeg();

  let lastProgress = 0;
  ffmpeg.on('progress', ({ progress }) => {
    const currentProgress = Math.round(progress * 100);
    if (currentProgress !== lastProgress) {
      console.log(`Extraction progress: ${currentProgress}%`);
      lastProgress = currentProgress;
      if (onProgress) {
        onProgress(currentProgress);
      }
    }
  });

  console.log('Writing video file to FFmpeg virtual filesystem...');
  const startWrite = Date.now();
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
  console.log(`File written in ${Date.now() - startWrite}ms`);

  console.log('Starting FFmpeg audio extraction...');
  const startExec = Date.now();
  
  // Use a timeout to detect if FFmpeg is stuck
  const timeoutMs = 5 * 60 * 1000; // 5 minutes
  const execPromise = ffmpeg.exec([
    '-i', 'input.mp4',
    '-vn',
    '-acodec', 'pcm_s16le',
    '-ar', '24000',
    '-ac', '1',
    'output.wav'
  ]);

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Audio extraction timeout: operation took longer than 5 minutes')), timeoutMs);
  });

  await Promise.race([execPromise, timeoutPromise]);
  console.log(`Extraction completed in ${((Date.now() - startExec) / 1000).toFixed(1)}s`);

  console.log('Reading extracted audio file...');
  const data = await ffmpeg.readFile('output.wav');
  
  console.log('Cleaning up temporary files...');
  await ffmpeg.deleteFile('input.mp4');
  await ffmpeg.deleteFile('output.wav');

  const uint8Data = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(0);
  console.log('Audio extraction complete. Audio size:', (uint8Data.length / 1024 / 1024).toFixed(2), 'MB');
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
