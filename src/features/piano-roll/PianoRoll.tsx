import React, { useState, useRef, memo, useCallback, useMemo } from 'react';
import { useStore, Note } from '../../store/useStore';
import { cn } from '../../utils/cn';
import { Music, Plus, Minus, MousePointer2 } from 'lucide-react';
import { motion } from 'motion/react';

const MIDI_NOTES = Array.from({ length: 25 }, (_, i) => 72 - i); // C5 to C3
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const getNoteName = (midi: number) => {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
};

const NoteItem = memo(({ 
  note, 
  rowIndex, 
  zoom, 
  onRemove 
}: { 
  note: Note; 
  rowIndex: number; 
  zoom: number; 
  onRemove: (id: string) => void;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="absolute bg-orange-500 rounded-md border border-white/20 shadow-[0_0_15px_rgba(249,115,22,0.3)] group cursor-pointer hover:brightness-110 transition-all"
    style={{
      left: `${note.start * 40 * zoom}px`,
      top: `${rowIndex * 32 + 1}px`,
      width: `${note.duration * 40 * zoom - 2}px`,
      height: '30px',
    }}
    onClick={(e) => {
      e.stopPropagation();
      onRemove(note.id);
    }}
  >
    <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-r-md" />
    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-black opacity-40 group-hover:opacity-100 uppercase pointer-events-none">
      {getNoteName(note.pitch)}
    </span>
  </motion.div>
));

NoteItem.displayName = 'NoteItem';

const Playhead = memo(({ zoom }: { zoom: number }) => {
  const currentStep = useStore(state => state.currentStep);
  return (
    <div 
      className="absolute top-0 bottom-0 w-px bg-orange-500 z-20 pointer-events-none transition-all duration-75 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
      style={{ left: `${currentStep * 40 * zoom}px` }}
    />
  );
});

Playhead.displayName = 'Playhead';

export const PianoRoll = memo(() => {
  const patterns = useStore(state => state.patterns);
  const activePatternId = useStore(state => state.activePatternId);
  const gridSize = useStore(state => state.gridSize);
  const addNote = useStore(state => state.addNote);
  const removeNote = useStore(state => state.removeNote);

  const activePattern = useMemo(() => patterns.find(p => p.id === activePatternId), [patterns, activePatternId]);
  const notes = activePattern?.notes || [];
  
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleGridClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const step = Math.floor(x / (40 * zoom));
    const rowIndex = Math.floor(y / 32);
    const pitch = MIDI_NOTES[rowIndex];

    if (step >= 0 && step < gridSize && pitch !== undefined) {
      const existingNote = notes.find(n => n.pitch === pitch && n.start === step);
      if (existingNote) {
        removeNote(existingNote.id);
      } else {
        addNote({
          pitch,
          start: step,
          duration: 1
        });
      }
    }
  }, [zoom, gridSize, notes, addNote, removeNote]);

  return (
    <div className="flex flex-col h-full daw-panel overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 border-b border-zinc-800/50 flex items-center px-6 justify-between bg-zinc-950/40">
        <div className="flex items-center gap-6">
          <h2 className="text-zinc-100 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Music className="w-4 h-4 text-orange-500" />
            Piano Roll
          </h2>
          <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800/50">
            <button 
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} 
              className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold text-zinc-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(z => Math.min(2, z + 0.1))} 
              className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-bold uppercase tracking-widest bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-zinc-800/50">
          <MousePointer2 className="w-3.5 h-3.5 text-orange-500" />
          <span>Draw Mode</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Piano Keys */}
        <div className="w-20 bg-zinc-950/60 border-r border-zinc-800/50 flex flex-col shrink-0 overflow-y-auto custom-scrollbar no-scrollbar">
          {MIDI_NOTES.map((midi) => {
            const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
            const isC = midi % 12 === 0;
            return (
              <div
                key={midi}
                className={cn(
                  "h-8 border-b border-zinc-800/30 flex items-center justify-end px-3 text-[10px] font-bold shrink-0 transition-colors relative",
                  isBlack ? "bg-zinc-900 text-zinc-500" : "bg-zinc-100 text-zinc-900 hover:bg-white",
                  isC && "border-b-zinc-600"
                )}
              >
                {isC && <span className="absolute left-2 text-[9px] opacity-40 uppercase">C{Math.floor(midi / 12) - 1}</span>}
                {getNoteName(midi)}
              </div>
            );
          })}
        </div>

        {/* Grid Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-auto custom-scrollbar relative bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)]"
          style={{
            backgroundSize: `${40 * zoom}px 32px`,
          }}
        >
          <Playhead zoom={zoom} />

          <div 
            className="relative cursor-crosshair"
            onClick={handleGridClick}
            style={{ 
              width: `${gridSize * 40 * zoom}px`,
              height: `${MIDI_NOTES.length * 32}px`
            }}
          >
            {/* Notes */}
            {notes.map((note) => {
              const rowIndex = MIDI_NOTES.indexOf(note.pitch);
              if (rowIndex === -1) return null;

              return (
                <NoteItem
                  key={note.id}
                  note={note}
                  rowIndex={rowIndex}
                  zoom={zoom}
                  onRemove={removeNote}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-10 bg-zinc-950/60 border-t border-zinc-800/50 flex items-center px-6 justify-between text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
        <div className="flex gap-6">
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            Notes: {notes.length}
          </span>
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            Scale: Chromatic
          </span>
        </div>
        <div className="flex gap-3 items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="text-zinc-400">PolySynth Active</span>
        </div>
      </div>
    </div>
  );
});

PianoRoll.displayName = 'PianoRoll';
