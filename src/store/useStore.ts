import { create } from 'zustand';

export type StepValue = 0 | 1;

export interface Track {
  id: string;
  name: string;
  color: string;
  sampleUrl?: string;
  volume: number; // -60 to 0
  pan: number; // -1 to 1
  reverb: number; // 0 to 1
  delay: number; // 0 to 1
}

export interface Note {
  id: string;
  pitch: number; // MIDI note number
  start: number; // Start step
  duration: number; // Duration in steps
}

export interface Pattern {
  id: string;
  name: string;
  trackSteps: Record<string, StepValue[]>; // trackId -> steps
  notes: Note[];
  color: string;
}

export interface ArrangementItem {
  id: string;
  patternId: string;
  startTime: number; // in steps (16n)
}

interface AppState {
  bpm: number;
  isPlaying: boolean;
  activePanel: string | null;
  currentStep: number;
  gridSize: number;
  playbackMode: 'pattern' | 'song';
  activePatternId: string;
  tracks: Track[];
  patterns: Pattern[];
  arrangement: ArrangementItem[];
  melodySettings: {
    volume: number;
    pan: number;
    reverb: number;
    delay: number;
  };
  setBpm: (bpm: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setActivePanel: (panel: string | null) => void;
  setCurrentStep: (step: number) => void;
  setGridSize: (size: number) => void;
  setPlaybackMode: (mode: 'pattern' | 'song') => void;
  setActivePatternId: (id: string) => void;
  toggleStep: (trackId: string, stepIndex: number) => void;
  updateTrackSample: (trackId: string, sampleUrl: string, fileName: string) => void;
  updateTrackMixer: (trackId: string, updates: Partial<Pick<Track, 'volume' | 'pan' | 'reverb' | 'delay'>>) => void;
  updateMelodyMixer: (updates: Partial<AppState['melodySettings']>) => void;
  addNote: (note: Omit<Note, 'id'>) => void;
  removeNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  addPattern: () => void;
  removePattern: (id: string) => void;
  updatePatternName: (id: string, name: string) => void;
  addToArrangement: (patternId: string, startTime: number) => void;
  removeFromArrangement: (id: string) => void;
  updateArrangementItem: (id: string, updates: Partial<ArrangementItem>) => void;
  clearArrangement: () => void;
  generateBeat: () => void;
  loadProject: (project: any) => void;
  resetProject: () => void;
}

const INITIAL_TRACKS: Track[] = [
  { id: 'kick', name: 'Kick', color: 'bg-orange-500', sampleUrl: 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3', volume: -6, pan: 0, reverb: 0, delay: 0 },
  { id: 'snare', name: 'Snare', color: 'bg-zinc-400', sampleUrl: 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3', volume: -6, pan: 0, reverb: 0.1, delay: 0 },
  { id: 'hihat', name: 'Hi-Hat', color: 'bg-zinc-200', sampleUrl: 'https://tonejs.github.io/audio/drum-samples/CR78/hh.mp3', volume: -12, pan: 0, reverb: 0.05, delay: 0 },
];

const DEFAULT_PATTERN: Pattern = {
  id: 'p1',
  name: 'Pattern 1',
  trackSteps: {
    'kick': Array(64).fill(0),
    'snare': Array(64).fill(0),
    'hihat': Array(64).fill(0),
  },
  notes: [],
  color: 'bg-orange-500',
};

export const useStore = create<AppState>((set) => ({
  bpm: 120,
  isPlaying: false,
  activePanel: 'sequencer',
  currentStep: 0,
  gridSize: 16,
  playbackMode: 'pattern',
  activePatternId: 'p1',
  tracks: INITIAL_TRACKS,
  patterns: [DEFAULT_PATTERN],
  arrangement: [],
  melodySettings: {
    volume: -6,
    pan: 0,
    reverb: 0.2,
    delay: 0.1,
  },
  setBpm: (bpm) => set({ bpm }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setGridSize: (gridSize) => set({ gridSize }),
  setPlaybackMode: (playbackMode) => set({ playbackMode }),
  setActivePatternId: (activePatternId) => set({ activePatternId }),
  
  toggleStep: (trackId, stepIndex) => set((state) => ({
    patterns: state.patterns.map(p => p.id === state.activePatternId ? {
      ...p,
      trackSteps: {
        ...p.trackSteps,
        [trackId]: p.trackSteps[trackId].map((s, i) => i === stepIndex ? (s === 0 ? 1 : 0) : s)
      }
    } : p)
  })),

  updateTrackSample: (trackId, sampleUrl, fileName) => set((state) => ({
    tracks: state.tracks.map(track => track.id === trackId 
      ? { ...track, name: fileName, sampleUrl }
      : track
    )
  })),

  updateTrackMixer: (trackId, updates) => set((state) => ({
    tracks: state.tracks.map(track => track.id === trackId ? { ...track, ...updates } : track)
  })),

  updateMelodyMixer: (updates) => set((state) => ({
    melodySettings: { ...state.melodySettings, ...updates }
  })),

  addNote: (note) => set((state) => ({
    patterns: state.patterns.map(p => p.id === state.activePatternId ? {
      ...p,
      notes: [...p.notes, { ...note, id: Math.random().toString(36).substr(2, 9) }]
    } : p)
  })),

  removeNote: (id) => set((state) => ({
    patterns: state.patterns.map(p => p.id === state.activePatternId ? {
      ...p,
      notes: p.notes.filter(n => n.id !== id)
    } : p)
  })),

  updateNote: (id, updates) => set((state) => ({
    patterns: state.patterns.map(p => p.id === state.activePatternId ? {
      ...p,
      notes: p.notes.map(n => n.id === id ? { ...n, ...updates } : n)
    } : p)
  })),

  addPattern: () => set((state) => {
    const id = `p${state.patterns.length + 1}`;
    const colors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
    const newPattern: Pattern = {
      id,
      name: `Pattern ${state.patterns.length + 1}`,
      trackSteps: state.tracks.reduce((acc, t) => ({ ...acc, [t.id]: Array(64).fill(0) }), {}),
      notes: [],
      color: colors[state.patterns.length % colors.length],
    };
    return { patterns: [...state.patterns, newPattern], activePatternId: id };
  }),

  removePattern: (id) => set((state) => ({
    patterns: state.patterns.filter(p => p.id !== id),
    arrangement: state.arrangement.filter(a => a.patternId !== id),
    activePatternId: state.activePatternId === id ? state.patterns[0]?.id || '' : state.activePatternId
  })),

  updatePatternName: (id, name) => set((state) => ({
    patterns: state.patterns.map(p => p.id === id ? { ...p, name } : p)
  })),

  addToArrangement: (patternId, startTime) => set((state) => ({
    arrangement: [...state.arrangement, { id: Math.random().toString(36).substr(2, 9), patternId, startTime }]
  })),

  removeFromArrangement: (id) => set((state) => ({
    arrangement: state.arrangement.filter(a => a.id !== id)
  })),
  updateArrangementItem: (id, updates) => set((state) => ({
    arrangement: state.arrangement.map(a => a.id === id ? { ...a, ...updates } : a)
  })),
  clearArrangement: () => set({ arrangement: [] }),
  generateBeat: () => set((state) => {
    const activePattern = state.patterns.find(p => p.id === state.activePatternId);
    if (!activePattern) return state;

    const newTrackSteps = { ...activePattern.trackSteps };
    const gridSize = state.gridSize;

    // 1. Generate Drums
    // Kick: 4-on-the-floor
    newTrackSteps['kick'] = Array(64).fill(0).map((_, i) => (i % 4 === 0 && i < gridSize) ? 1 : 0);
    // Snare: Steps 4 and 12 (0-indexed: 4, 12)
    newTrackSteps['snare'] = Array(64).fill(0).map((_, i) => ((i === 4 || i === 12) && i < gridSize) ? 1 : 0);
    // Hi-hat: Every 2 steps or random
    newTrackSteps['hihat'] = Array(64).fill(0).map((_, i) => (i % 2 === 0 && i < gridSize && Math.random() > 0.2) ? 1 : 0);

    // 2. Generate Chords (C Major / A Minor)
    const progressions = [
      [60, 64, 67], // C Major
      [65, 69, 72], // F Major
      [67, 71, 74], // G Major
      [69, 72, 76], // A Minor
    ];
    
    // Pick a random progression
    const progression = progressions[Math.floor(Math.random() * progressions.length)];
    const newNotes: Note[] = progression.map((pitch) => ({
      id: Math.random().toString(36).substr(2, 9),
      pitch,
      start: 0,
      duration: gridSize,
    }));

    return {
      patterns: state.patterns.map(p => p.id === state.activePatternId ? {
        ...p,
        trackSteps: newTrackSteps,
        notes: newNotes
      } : p)
    };
  }),
  loadProject: (project) => set((state) => ({
    ...state,
    ...project,
    isPlaying: false, // Always stop playback on load
    currentStep: 0,
  })),
  resetProject: () => set({
    bpm: 120,
    isPlaying: false,
    activePanel: 'sequencer',
    currentStep: 0,
    gridSize: 16,
    playbackMode: 'pattern',
    activePatternId: 'p1',
    tracks: INITIAL_TRACKS,
    patterns: [DEFAULT_PATTERN],
    arrangement: [],
    melodySettings: {
      volume: -6,
      pan: 0,
      reverb: 0.2,
      delay: 0.1,
    },
  }),
}));
