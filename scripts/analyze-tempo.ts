#!/usr/bin/env npx tsx
/**
 * CLI Script to analyze tempo of audio/video files
 * 
 * Usage: npx tsx scripts/analyze-tempo.ts [video-path-or-name]
 * 
 * Examples:
 *   npx tsx scripts/analyze-tempo.ts wish-my-life-away.mp4
 *   npx tsx scripts/analyze-tempo.ts public/.hidden/wish-my-life-away.mp4
 *   npx tsx scripts/analyze-tempo.ts let-it-go.mp4
 * 
 * This script runs tempo analysis entirely in Node.js using ffmpeg for audio
 * extraction. No browser or UI is required.
 */

import { 
  extractAudioBuffer, 
  findMediaFile, 
  listAvailableMediaFiles,
  isFFmpegAvailable
} from '../src/beat/utils/nodeAudio';
import { 
  analyzeTempoComplete,
  type SectionalAnalysis
} from '../src/beat/utils/tempoDetectorCore';

const DEFAULT_VIDEO = 'wish-my-life-away.mp4';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function printSectionalAnalysis(analysis: SectionalAnalysis): void {
  console.log('\n=== Sectional Tempo Analysis ===');
  console.log(`Global BPM: ${analysis.globalBpm}`);
  console.log(`Tempo variation: ±${analysis.variationPercent.toFixed(1)}%`);
  console.log(`Range: ${analysis.tempoRange.min} - ${analysis.tempoRange.max} BPM`);
  console.log('');
  console.log('Section-by-section breakdown:');
  console.log('─────────────────────────────────────────────────────');
  console.log('Time Range      Est. BPM    Diff      IOI StdDev');
  console.log('─────────────────────────────────────────────────────');
  
  for (const section of analysis.sections) {
    const timeRange = `${formatTime(section.startTime)}-${formatTime(section.endTime)}`;
    const diff = section.estimatedBpm - analysis.globalBpm;
    const diffStr = diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
    const stdDevMs = (section.ioiStdDev * 1000).toFixed(0);
    
    console.log(
      `${timeRange.padEnd(16)}${section.estimatedBpm.toFixed(2).padStart(8)}  ${diffStr.padStart(8)}    ${stdDevMs.padStart(6)}ms`
    );
  }
  
  console.log('─────────────────────────────────────────────────────');
  
  // Trend analysis
  if (analysis.trend !== 'stable') {
    const direction = analysis.trend === 'speeds_up' ? 'SPEEDS UP' : 'SLOWS DOWN';
    console.log(`\nTrend: Song ${direction} over time (~${analysis.trendAmount.toFixed(2)} BPM from start to end)`);
  } else {
    console.log('\nTrend: Tempo remains relatively stable throughout');
  }
}

function printRecommendation(analysis: SectionalAnalysis): void {
  console.log('');
  if (analysis.variationPercent < 1) {
    console.log(`✅ Recommendation: Tempo is stable. Single BPM of ${analysis.globalBpm} should work well.`);
  } else if (analysis.variationPercent < 2) {
    console.log(`⚠️  Recommendation: Minor tempo variation (±${analysis.variationPercent.toFixed(1)}%). Normal for human performances.`);
  } else if (analysis.variationPercent < 4) {
    console.log(`⚠️  Recommendation: Moderate variation (±${analysis.variationPercent.toFixed(1)}%). Song may intentionally speed up/slow down.`);
  } else {
    console.log(`❌ Recommendation: Significant variation (±${analysis.variationPercent.toFixed(1)}%). Single BPM won't work well.`);
  }
}

async function analyzeFile(filePath: string): Promise<void> {
  console.log(`\n🎵 Analyzing tempo for: ${filePath}\n`);
  
  // Check ffmpeg availability first
  if (!isFFmpegAvailable()) {
    console.log('⚠️  ffmpeg not found. Falling back to browser-based analysis...');
    console.log('   (Install ffmpeg for faster analysis: brew install ffmpeg)\n');
    await analyzeInBrowser(filePath);
    return;
  }
  
  try {
    // Extract audio
    console.log('📁 Extracting audio...');
    const audioBuffer = await extractAudioBuffer(filePath);
    console.log(`✓ Extracted ${audioBuffer.duration.toFixed(1)}s of audio (${audioBuffer.sampleRate}Hz)`);
    
    // Run complete analysis
    console.log('🔍 Detecting onsets...');
    const result = analyzeTempoComplete(audioBuffer);
    console.log(`✓ Found ${result.onsets.length} onsets`);
    
    console.log('🎯 Estimating tempo...');
    console.log(`✓ Detected BPM: ${result.bpm} (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
    
    if (result.musicStartTime > 0.5) {
      console.log(`🎼 Music starts at: ${formatTime(result.musicStartTime)}`);
    }
    
    // Print warnings
    if (result.warnings.length > 0) {
      console.log('');
      for (const warning of result.warnings) {
        console.log(`⚠️  ${warning}`);
      }
    }
    
    // Print sectional analysis
    printSectionalAnalysis(result.sectionalAnalysis);
    
    // Print recommendation
    printRecommendation(result.sectionalAnalysis);
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Fallback: analyze using a real browser when ffmpeg is not available
 */
async function analyzeInBrowser(filePath: string): Promise<void> {
  // Use @playwright/test which is already a devDependency
  const { chromium } = await import('@playwright/test');
  
  // Convert to URL for the dev server
  const relativePath = filePath.replace(/^.*public/, '');
  const videoUrl = `http://localhost:5173${relativePath}`;
  
  console.log(`🌐 Using browser-based analysis`);
  console.log(`📁 Video URL: ${videoUrl}\n`);
  
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome',
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capture console logs
    const logs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      logs.push(text);
      
      // Print analysis-related logs
      if (text.includes('Sectional Tempo') ||
          text.includes('Section-by-section') ||
          text.includes('Time Range') ||
          text.includes('───') ||
          text.includes('===') ||
          text.includes('Trend:') ||
          text.includes('Recommendation') ||
          text.includes('Tempo variation') ||
          text.includes('Global detected') ||
          text.includes('[BeatAnalyzer]') ||
          text.includes('[OctaveSelection]') ||
          text.includes('[TempoEnsemble]') ||
          text.includes('[GapDetector]') ||
          text.includes('[FermataDetector]') ||
          text.includes('Error') ||
          text.includes('error') ||
          text.match(/^\s*\d+:\d+/)) {
        console.log(text);
      }
    });
    
    page.on('pageerror', (err) => {
      console.error('Page error:', err.message);
    });
    
    await page.goto('http://localhost:5173/beat/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✓ Loaded beat finder app');
    
    await page.click('body');
    await page.waitForTimeout(500);
    
    await page.evaluate((url) => {
      window.dispatchEvent(new CustomEvent('load-media-url', { detail: { url } }));
    }, videoUrl);
    console.log('✓ Triggered video analysis\n');
    
    let complete = false;
    const startTime = Date.now();
    const timeout = 180000;
    
    while (!complete && Date.now() - startTime < timeout) {
      await page.waitForTimeout(2000);
      complete = logs.some(log => 
        log.includes('Recommendation') || 
        log.includes('BPM ACCURACY TEST')
      );
      
      if (logs.some(log => log.includes('Error analyzing') || log.includes('Could not extract'))) {
        console.error('\n❌ Analysis failed');
        break;
      }
    }
    
    if (complete) {
      console.log('\n✓ Analysis complete!');
    }
    
    await page.waitForTimeout(2000);
    
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const input = process.argv[2] || DEFAULT_VIDEO;
  
  // Find the file
  const resolvedPath = findMediaFile(input);
  
  if (!resolvedPath) {
    console.error(`❌ File not found: ${input}`);
    console.error('');
    console.error('Searched in: public/.hidden, public, ., src, assets');
    console.error('');
    
    const available = listAvailableMediaFiles();
    if (available.length > 0) {
      console.error('Available files in public/.hidden:');
      for (const file of available) {
        console.error(`  - ${file}`);
      }
    }
    
    process.exit(1);
  }
  
  await analyzeFile(resolvedPath);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
