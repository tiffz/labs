/**
 * Node.js Audio Processing Utilities
 * 
 * This module provides audio extraction and processing for Node.js environments.
 * It uses ffmpeg to extract audio from video/audio files and converts them to
 * UniversalAudioBuffer format for use with our tempo detection algorithms.
 * 
 * NOTE: This module should only be imported in Node.js environments (CLI scripts).
 * It will fail in browsers as it uses Node.js-specific APIs.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { UniversalAudioBuffer } from './audioBuffer';
import { createAudioBuffer } from './audioBuffer';

/**
 * Check if ffmpeg is available
 */
export function isFFmpegAvailable(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract audio from a video/audio file and return as UniversalAudioBuffer
 * 
 * @param filePath - Path to the audio/video file
 * @param targetSampleRate - Target sample rate (default: 44100)
 * @returns Audio buffer compatible with tempo detection
 */
export async function extractAudioBuffer(
  filePath: string,
  targetSampleRate: number = 44100
): Promise<UniversalAudioBuffer> {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  
  if (!isFFmpegAvailable()) {
    throw new Error('ffmpeg is required for audio extraction. Please install ffmpeg.');
  }
  
  // Create temp file for raw audio
  const tempFile = path.join(os.tmpdir(), `audio-extract-${Date.now()}.raw`);
  
  try {
    // Extract audio as raw 32-bit float, mono
    execSync(
      `ffmpeg -y -i "${absolutePath}" -vn -acodec pcm_f32le -ar ${targetSampleRate} -ac 1 -f f32le "${tempFile}" 2>/dev/null`,
      { stdio: 'pipe' }
    );
    
    // Read the raw audio data
    const buffer = fs.readFileSync(tempFile);
    const samples = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
    
    return createAudioBuffer(samples, targetSampleRate);
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

/**
 * Find a media file by name, searching common directories
 */
export function findMediaFile(fileNameOrPath: string, searchDirs: string[] = []): string | null {
  const defaultDirs = [
    'public/.hidden',
    'public',
    '.',
    'src',
    'assets',
  ];
  
  const dirsToSearch = searchDirs.length > 0 ? searchDirs : defaultDirs;
  
  // If it's an absolute path, just check if it exists
  if (path.isAbsolute(fileNameOrPath)) {
    return fs.existsSync(fileNameOrPath) ? fileNameOrPath : null;
  }
  
  // If the path exists as-is (relative path with directory), use it
  if (fs.existsSync(fileNameOrPath)) {
    return path.resolve(fileNameOrPath);
  }
  
  // Extract just the filename if a path was provided
  const fileName = path.basename(fileNameOrPath);
  
  // Search in specified directories
  for (const dir of dirsToSearch) {
    const fullPath = path.join(dir, fileName);
    if (fs.existsSync(fullPath)) {
      return path.resolve(fullPath);
    }
  }
  
  // Try case-insensitive search in public/.hidden
  const hiddenDir = 'public/.hidden';
  if (fs.existsSync(hiddenDir)) {
    const files = fs.readdirSync(hiddenDir);
    for (const file of files) {
      if (file === fileName || file.toLowerCase() === fileName.toLowerCase()) {
        return path.resolve(path.join(hiddenDir, file));
      }
    }
  }
  
  return null;
}

/**
 * List available media files in the hidden directory
 */
export function listAvailableMediaFiles(): string[] {
  const hiddenDir = 'public/.hidden';
  if (!fs.existsSync(hiddenDir)) {
    return [];
  }
  
  return fs.readdirSync(hiddenDir)
    .filter(f => 
      f.endsWith('.mp4') || 
      f.endsWith('.mp3') || 
      f.endsWith('.wav') ||
      f.endsWith('.m4a') ||
      f.endsWith('.webm')
    );
}
