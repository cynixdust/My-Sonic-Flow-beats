import React, { useRef, memo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../utils/cn';
import { Settings2, Trash2, Upload, Music, Wand2 } from 'lucide-react';
import { audioEngine } from '../../audio-engine/engine';

const StepButton = memo(({ 
  isActive, 
  isBeat, 
  index,
  trackColor, 
  onClick 
}: { 
  isActive: boolean; 
  isBeat: boolean; 
  index: number; 
  trackColor: string; 
  onClick: () => void;
}) => {
  const isCurrent = useStore(state => state.currentStep === index);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "aspect-square rounded-md transition-all duration-150 relative border border-transparent",
        isActive 
          ? cn(trackColor, "shadow-[0_0_15px_rgba(255,255,255,0.1)] border-white/20") 
          : isBeat ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-800/40 hover:bg-zinc-700/60",
        "hover:scale-105 active:scale-90",
        isCurrent && "ring-2 ring-orange-500 ring-offset-2 ring-offset-black z-10"
      )}
    >
      {isCurrent && (
        <div className="absolute inset-0 bg-white/10 animate-pulse rounded-md" />
      )}
    </button>
  );
});

StepButton.displayName = 'StepButton';

export const StepSequencer = memo(() => {
  const patterns = useStore(state => state.patterns);
  const activePatternId = useStore(state => state.activePatternId);
  const gridSize = useStore(state => state.gridSize);
  const tracks = useStore(state => state.tracks);
  const toggleStep = useStore(state => state.toggleStep);
  const setGridSize = useStore(state => state.setGridSize);
  const updateTrackSample = useStore(state => state.updateTrackSample);
  const generateBeat = useStore(state => state.generateBeat);

  const activePattern = patterns.find(p => p.id === activePatternId);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleClear = useCallback(() => {
    if (!activePattern) return;
    tracks.forEach(t => {
      const steps = activePattern.trackSteps[t.id];
      if (steps) {
        steps.forEach((s, i) => {
          if (s === 1) toggleStep(t.id, i);
        });
      }
    });
  }, [activePattern, tracks, toggleStep]);

  const handleFileUpload = useCallback(async (trackId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      try {
        await audioEngine.loadSample(trackId, url);
        updateTrackSample(trackId, url, file.name.split('.')[0]);
      } catch (error) {
        alert('Failed to load sample. Please try a different file.');
      }
    }
  }, [updateTrackSample]);

  return (
    <div className="flex flex-col h-full daw-panel p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-zinc-100 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-orange-500" />
            Channel Rack
          </h2>
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800/50">
            {[16, 32, 64].map((size) => (
              <button
                key={size}
                onClick={() => setGridSize(size)}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                  gridSize === size ? "bg-zinc-800 text-orange-500 shadow-inner" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={generateBeat}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black rounded-lg text-[10px] font-bold uppercase transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            title="Generate AI Beat"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Generate Beat
          </button>
          
          <button 
            onClick={handleClear}
            className="daw-button text-zinc-500 hover:text-red-400"
            title="Clear Pattern"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex flex-col gap-4">
          {tracks.map((track) => (
            <div key={track.id} className="flex items-center gap-4 group">
              <div className="w-36 shrink-0 flex items-center gap-3">
                <div className={cn("w-1.5 h-8 rounded-full shadow-lg", track.color)} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-tighter truncate group-hover:text-white transition-colors">
                    {track.name}
                  </span>
                  <button 
                    onClick={() => fileInputRefs.current[track.id]?.click()}
                    className="flex items-center gap-1 text-[9px] text-zinc-600 hover:text-orange-500 transition-colors uppercase font-bold"
                  >
                    <Upload className="w-2.5 h-2.5" />
                    Swap
                  </button>
                  <input
                    type="file"
                    ref={el => fileInputRefs.current[track.id] = el}
                    onChange={(e) => handleFileUpload(track.id, e)}
                    accept="audio/*"
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex-1 grid grid-cols-16 gap-1.5 min-w-0">
                {(activePattern?.trackSteps[track.id] || Array(64).fill(0)).slice(0, gridSize).map((step, i) => (
                  <StepButton
                    key={i}
                    isActive={step === 1}
                    isBeat={i % 4 === 0}
                    index={i}
                    trackColor={track.color}
                    onClick={() => toggleStep(track.id, i)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase">
        <div className="flex gap-4 items-center">
          <span>Steps: {gridSize}</span>
          <span className="w-px h-3 bg-zinc-800" />
          <div className="flex items-center gap-1">
            <Music className="w-3 h-3" />
            <span>Sample Engine Active</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Low Latency Mode</span>
        </div>
      </div>
    </div>
  );
});

StepSequencer.displayName = 'StepSequencer';
