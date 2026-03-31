import * as Tone from 'tone';
import { useStore, Track, Pattern, ArrangementItem } from '../store/useStore';
import lamejs from 'lamejs';

export interface ExportOptions {
  format: 'wav' | 'mp3';
  bitrate?: number; // for mp3: 128, 192, 256, 320
}

export class ExportService {
  public static async renderSong(options: ExportOptions): Promise<Blob> {
    const state = useStore.getState();
    const { arrangement, patterns, tracks, bpm, melodySettings } = state;

    if (arrangement.length === 0) {
      throw new Error('Arrangement is empty');
    }

    // Calculate total duration in steps
    const maxStep = Math.max(...arrangement.map(a => a.startTime + 64));
    const durationInSeconds = (maxStep * 60) / (bpm * 4); // 16n steps

    // Render offline
    const buffer = await Tone.Offline(async (context) => {
      // Recreate the signal chain in the offline context
      context.transport.bpm.value = bpm;

      const channels = new Map<string, any>();
      const melodyChannel = await this.createOfflineChannel(context);
      
      // Setup tracks
      for (const track of tracks) {
        const channel = await this.createOfflineChannel(context);
        this.applyChannelParams(channel, track);
        channels.set(track.id, channel);
      }

      this.applyChannelParams(melodyChannel, melodySettings);

      // Setup players and synth
      const players = new Tone.Players().toDestination();
      const synth = new Tone.PolySynth(Tone.Synth).connect(melodyChannel.eq);
      
      // Load buffers from the main engine to avoid re-loading
      const mainPlayers = (await import('../audio-engine/engine')).audioEngine.getPlayers();
      for (const track of tracks) {
        if (mainPlayers.has(track.id)) {
          players.add(track.id, mainPlayers.player(track.id).buffer);
          players.player(track.id).connect(channels.get(track.id).eq);
        }
      }

      // Schedule arrangement
      arrangement.forEach(item => {
        const pattern = patterns.find(p => p.id === item.patternId);
        if (!pattern) return;

        const startTime = Tone.Time(`${item.startTime} * 16n`).toSeconds();

        // Schedule tracks
        tracks.forEach(track => {
          const steps = pattern.trackSteps[track.id];
          if (steps) {
            steps.forEach((s, i) => {
              if (s === 1) {
                const triggerTime = startTime + Tone.Time(`${i} * 16n`).toSeconds();
                players.player(track.id).start(triggerTime);
              }
            });
          }
        });

        // Schedule melody
        pattern.notes.forEach(note => {
          const triggerTime = startTime + Tone.Time(`${note.start} * 16n`).toSeconds();
          const frequency = Tone.Frequency(note.pitch, "midi").toFrequency();
          const duration = `${note.duration * 0.25}n`;
          synth.triggerAttackRelease(frequency, duration, triggerTime);
        });
      });

      // Start the offline transport
      context.transport.start();
    }, durationInSeconds + 2); // Add a small tail for reverb/delay

    if (options.format === 'wav') {
      return this.bufferToWav(buffer);
    } else {
      return this.bufferToMp3(buffer, options.bitrate || 192);
    }
  }

  private static async createOfflineChannel(context: any) {
    const volume = new Tone.Volume(0).toDestination();
    const panner = new Tone.Panner(0).connect(volume);
    const reverb = new Tone.Reverb({ decay: 2, wet: 0 }).connect(panner);
    const delay = new Tone.FeedbackDelay("8n", 0.5).connect(reverb);
    const eq = new Tone.EQ3(0, 0, 0).connect(delay);
    
    await reverb.generate();
    
    return { volume, panner, reverb, delay, eq };
  }

  private static applyChannelParams(channel: any, params: any) {
    if (params.volume !== undefined) channel.volume.volume.value = params.volume;
    if (params.pan !== undefined) channel.panner.pan.value = params.pan;
    if (params.reverb !== undefined) channel.reverb.wet.value = params.reverb;
    if (params.delay !== undefined) channel.delay.wet.value = params.delay;
  }

  private static bufferToWav(buffer: Tone.ToneAudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numChannels * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, length - 8, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * numChannels * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, length - 44, true);

    // write the PCM samples
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const s = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([out], { type: 'audio/wav' });
  }

  private static bufferToMp3(buffer: Tone.ToneAudioBuffer, bitrate: number): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, bitrate);
    const mp3Data: any[] = [];

    const left = this.floatTo16BitPCM(buffer.getChannelData(0));
    const right = numChannels > 1 ? this.floatTo16BitPCM(buffer.getChannelData(1)) : undefined;

    const sampleBlockSize = 1152;
    for (let i = 0; i < left.length; i += sampleBlockSize) {
      const leftChunk = left.subarray(i, i + sampleBlockSize);
      const rightChunk = right ? right.subarray(i, i + sampleBlockSize) : undefined;
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
  }

  private static floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  private static writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
