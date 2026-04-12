import type { VoiceManifest } from './types';

const VOICE_BASE_PATH = '/pulse/voice';

export class VoicePackLoader {
  private buffers = new Map<string, AudioBuffer>();
  private manifest: VoiceManifest | null = null;
  private loadPromise: Promise<void> | null = null;

  async load(ctx: AudioContext): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.doLoad(ctx);
    return this.loadPromise;
  }

  private async doLoad(ctx: AudioContext): Promise<void> {
    const resp = await fetch(`${VOICE_BASE_PATH}/manifest.json`);
    this.manifest = (await resp.json()) as VoiceManifest;

    const loads = this.manifest.samples.map(async (sample) => {
      try {
        const url = `${VOICE_BASE_PATH}/${sample.file}`;
        const audioResp = await fetch(url);
        if (!audioResp.ok) return;
        const arrayBuf = await audioResp.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuf);
        this.buffers.set(sample.id, audioBuffer);
      } catch {
        // Skip samples that fail to load — the engine will silently omit them
      }
    });

    await Promise.all(loads);
  }

  getSample(id: string): AudioBuffer | undefined {
    return this.buffers.get(id);
  }

  isLoaded(): boolean {
    return this.manifest !== null && this.buffers.size > 0;
  }
}
