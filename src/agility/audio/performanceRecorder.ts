/**
 * Lightweight recording for sing-back (MediaRecorder wraps live mic stream).
 */
export class SingPerformanceRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];

  start(stream: MediaStream): void {
    this.stop();
    this.chunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    this.recorder = new MediaRecorder(stream, { mimeType: mime });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(200);
  }

  async stop(): Promise<Blob | null> {
    const rec = this.recorder;
    if (!rec || rec.state === 'inactive') {
      this.recorder = null;
      return null;
    }
    const mime = (rec.mimeType || 'audio/webm').split(';')[0] || 'audio/webm';
    await new Promise<void>((resolve) => {
      rec.addEventListener('stop', () => resolve(), { once: true });
      rec.stop();
    });
    this.recorder = null;
    if (this.chunks.length === 0) return null;
    return new Blob(this.chunks, { type: mime });
  }
}
