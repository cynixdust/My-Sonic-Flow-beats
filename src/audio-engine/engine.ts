import * as Tone from 'tone';
import { useStore, Track } from '../store/useStore';

interface Channel {
  volume: Tone.Volume;
  panner: Tone.Panner;
  reverbSend: Tone.Gain;
  delaySend: Tone.Gain;
  eq: Tone.EQ3;
}

class AudioEngine {
  private static instance: AudioEngine;
  private players: Tone.Players;
  private synth: Tone.PolySynth;
  private sequence: Tone.Sequence | null = null;
  private channels: Map<string, Channel> = new Map();
  private melodyChannel: Channel | null = null;
  
  // Shared effects
  private globalReverb: Tone.Reverb;
  private globalDelay: Tone.FeedbackDelay;
  
  public getPlayers() { return this.players; }
  public getSynth() { return this.synth; }

  private constructor() {
    // Optimize for low latency
    if (Tone.getContext().latencyHint !== 'interactive') {
      try {
        Tone.setContext(new Tone.Context({ latencyHint: 'interactive' }));
      } catch (e) {
        console.warn('Could not set latencyHint:', e);
      }
    }
    Tone.getContext().lookAhead = 0.1; // Slightly higher lookahead for stability on low-resource devices

    this.players = new Tone.Players();
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.3,
        release: 1
      }
    });

    // Initialize shared effects
    this.globalReverb = new Tone.Reverb({ decay: 2, wet: 1 }).toDestination();
    this.globalDelay = new Tone.FeedbackDelay("8n", 0.5).toDestination();
    this.globalReverb.generate();
    
    this.setupChannels();
    this.loadInitialSamples();
    this.setupSequence();
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public reinitialize() {
    // Disconnect and dispose old channels
    this.channels.forEach(channel => {
      channel.volume.dispose();
      channel.panner.dispose();
      channel.reverbSend.dispose();
      channel.delaySend.dispose();
      channel.eq.dispose();
    });
    this.channels.clear();

    if (this.melodyChannel) {
      this.melodyChannel.volume.dispose();
      this.melodyChannel.panner.dispose();
      this.melodyChannel.reverbSend.dispose();
      this.melodyChannel.delaySend.dispose();
      this.melodyChannel.eq.dispose();
    }

    // Dispose and recreate players to avoid "buffer already exists" errors
    this.players.dispose();
    this.players = new Tone.Players();

    // Re-setup
    this.setupChannels();
    this.loadInitialSamples();
  }

  private createChannel(): Channel {
    const volume = new Tone.Volume(0).toDestination();
    const panner = new Tone.Panner(0).connect(volume);
    
    // Send nodes
    const reverbSend = new Tone.Gain(0).connect(this.globalReverb);
    const delaySend = new Tone.Gain(0).connect(this.globalDelay);
    
    const eq = new Tone.EQ3(0, 0, 0).connect(panner);
    eq.connect(reverbSend);
    eq.connect(delaySend);
    
    return { volume, panner, reverbSend, delaySend, eq };
  }

  private setupChannels() {
    const { tracks, melodySettings } = useStore.getState();
    
    // Setup drum channels
    tracks.forEach(track => {
      const channel = this.createChannel();
      this.channels.set(track.id, channel);
      this.updateChannelParams(track.id, track);
    });

    // Setup melody channel
    this.melodyChannel = this.createChannel();
    this.synth.connect(this.melodyChannel.eq);
    this.updateMelodyParams(melodySettings);
  }

  public updateChannelParams(id: string, params: Partial<Track>) {
    const channel = this.channels.get(id);
    if (!channel) return;

    if (params.volume !== undefined) channel.volume.volume.value = params.volume;
    if (params.pan !== undefined) channel.panner.pan.value = params.pan;
    if (params.reverb !== undefined) channel.reverbSend.gain.value = params.reverb;
    if (params.delay !== undefined) channel.delaySend.gain.value = params.delay;
  }

  public updateMelodyParams(params: Partial<{ volume: number, pan: number, reverb: number, delay: number }>) {
    if (!this.melodyChannel) return;

    if (params.volume !== undefined) this.melodyChannel.volume.volume.value = params.volume;
    if (params.pan !== undefined) this.melodyChannel.panner.pan.value = params.pan;
    if (params.reverb !== undefined) this.melodyChannel.reverbSend.gain.value = params.reverb;
    if (params.delay !== undefined) this.melodyChannel.delaySend.gain.value = params.delay;
  }

  private loadInitialSamples() {
    const { tracks } = useStore.getState();
    tracks.forEach(track => {
      if (track.sampleUrl) {
        if (this.players.has(track.id)) {
          const player = this.players.player(track.id);
          const channel = this.channels.get(track.id);
          if (channel) player.connect(channel.eq);
          return;
        }

        this.players.add(track.id, track.sampleUrl, () => {
          const player = this.players.player(track.id);
          const channel = this.channels.get(track.id);
          if (channel) player.connect(channel.eq);
        });
      }
    });
  }

  public async loadSample(trackId: string, url: string) {
    return new Promise<void>((resolve, reject) => {
      const buffer = new Tone.ToneAudioBuffer(url, () => {
        if (this.players.has(trackId)) {
          this.players.player(trackId).buffer = buffer;
        } else {
          this.players.add(trackId, buffer);
        }
        
        const player = this.players.player(trackId);
        const channel = this.channels.get(trackId);
        if (channel) player.connect(channel.eq);
        resolve();
      }, (err) => {
        console.error(`Failed to load sample for ${trackId}:`, err);
        reject(err);
      });
    });
  }

  private setupSequence() {
    this.sequence = new Tone.Sequence(
      (time, step) => {
        const state = useStore.getState();
        const { patterns, arrangement, playbackMode, activePatternId, gridSize, setCurrentStep, tracks, setIsPlaying } = state;
        
        if (playbackMode === 'pattern') {
          const activePattern = patterns.find(p => p.id === activePatternId);
          if (!activePattern) return;

          const currentGridStep = step % gridSize;
          
          // Use Tone.Draw to sync UI updates with audio
          Tone.Draw.schedule(() => {
            setCurrentStep(currentGridStep);
          }, time);

          tracks.forEach((track) => {
            const steps = activePattern.trackSteps[track.id];
            if (steps && steps[currentGridStep] === 1) {
              this.triggerSound(track.id, time);
            }
          });

          activePattern.notes.forEach((note) => {
            if (note.start === currentGridStep) {
              const frequency = Tone.Frequency(note.pitch, "midi").toFrequency();
              const duration = `${note.duration * 0.25}n`;
              this.synth.triggerAttackRelease(frequency, duration, time);
            }
          });
        } else {
          // Song Mode
          Tone.Draw.schedule(() => {
            setCurrentStep(step);
          }, time);

          // Find the end of the song
          const maxStep = arrangement.length > 0 ? Math.max(...arrangement.map(a => a.startTime + 64)) : 0;
          if (step >= maxStep && maxStep > 0) {
            Tone.Draw.schedule(() => {
              this.togglePlayback(false, 'song');
              setIsPlaying(false);
            }, time);
            return;
          }

          // Find all patterns that should be playing at this step
          arrangement.forEach(item => {
            const pattern = patterns.find(p => p.id === item.patternId);
            if (!pattern) return;

            const relativeStep = step - item.startTime;
            if (relativeStep >= 0 && relativeStep < 64) {
              tracks.forEach((track) => {
                const steps = pattern.trackSteps[track.id];
                if (steps && steps[relativeStep] === 1) {
                  this.triggerSound(track.id, time);
                }
              });

              pattern.notes.forEach((note) => {
                if (note.start === relativeStep) {
                  const frequency = Tone.Frequency(note.pitch, "midi").toFrequency();
                  const duration = `${note.duration * 0.25}n`;
                  this.synth.triggerAttackRelease(frequency, duration, time);
                }
              });
            }
          });
        }
      },
      Array.from({ length: 1024 }, (_, i) => i),
      "16n"
    );
  }

  private triggerSound(id: string, time: number) {
    if (this.players.has(id)) {
      const player = this.players.player(id);
      if (player.buffer.loaded) {
        player.start(time);
      }
    }
  }

  public async start() {
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
      console.log('Audio Context started with latencyHint:', Tone.getContext().latencyHint);
    }
  }

  public setBpm(bpm: number) {
    Tone.getTransport().bpm.value = bpm;
  }

  public togglePlayback(isPlaying: boolean, mode: 'pattern' | 'song' = 'pattern') {
    if (isPlaying) {
      if (mode === 'song') {
        Tone.getTransport().seconds = 0;
      }
      Tone.getTransport().start();
      this.sequence?.start(0);
    } else {
      Tone.getTransport().stop();
      this.sequence?.stop();
      useStore.getState().setCurrentStep(0);
    }
  }
}

export const audioEngine = AudioEngine.getInstance();
