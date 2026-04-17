import type { MidiDevice } from '../music/scoreTypes';

type MidiCallback = (type: 'noteon' | 'noteoff', note: number, velocity: number, timestamp: number, deviceId: string) => void;
type ConnectionCallback = (connected: boolean, devices: MidiDevice[]) => void;

export class MidiInput {
  private access: MIDIAccess | null = null;
  private noteCallback: MidiCallback | null = null;
  private connectionCallback: ConnectionCallback | null = null;
  private connected = false;

  async init(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) return false;
    try {
      this.access = await navigator.requestMIDIAccess();
      this.access.onstatechange = () => this.updateDevices();
      this.updateDevices();
      return true;
    } catch {
      return false;
    }
  }

  private updateDevices() {
    if (!this.access) return;
    const devices: MidiDevice[] = [];
    this.access.inputs.forEach((input) => {
      devices.push({
        id: input.id,
        name: input.name || 'Unknown Device',
        manufacturer: input.manufacturer || 'Unknown',
        connected: input.state === 'connected',
      });
      const id = input.id;
      input.onmidimessage = (event) => this.handleMessage(event, id);
    });
    this.connected = devices.some(d => d.connected);
    this.connectionCallback?.(this.connected, devices);
  }

  private handleMessage(event: MIDIMessageEvent, deviceId: string) {
    if (!event.data || event.data.length < 3) return;
    const ts = event.timeStamp || performance.now();
    const [status, note, velocity] = event.data;
    const command = status & 0xf0;
    if (command === 0x90 && velocity > 0) {
      this.noteCallback?.('noteon', note, velocity / 127, ts, deviceId);
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      this.noteCallback?.('noteoff', note, 0, ts, deviceId);
    } else if (command === 0xb0) {
      if (note === 120 || note === 121 || note === 123) {
        for (let midiNote = 0; midiNote < 128; midiNote += 1) {
          this.noteCallback?.('noteoff', midiNote, 0, ts, deviceId);
        }
      }
    }
  }

  onNote(cb: MidiCallback) { this.noteCallback = cb; }
  onConnection(cb: ConnectionCallback) { this.connectionCallback = cb; }
  isConnected() { return this.connected; }
}

let instance: MidiInput | null = null;
export function getMidiInput(): MidiInput {
  if (!instance) instance = new MidiInput();
  return instance;
}
