import React, { memo, useCallback } from 'react';
import { useStore, Track } from '../../store/useStore';
import { cn } from '../../utils/cn';
import { Sliders, Volume2, Activity, Wind, Repeat } from 'lucide-react';
import { audioEngine } from '../../audio-engine/engine';
import { motion } from 'motion/react';

const ChannelStrip = memo(({ 
  name, 
  color, 
  volume, 
  pan, 
  reverb, 
  delay, 
  onChange 
}: { 
  name: string, 
  color: string, 
  volume: number, 
  pan: number, 
  reverb: number, 
  delay: number,
  onChange: (updates: any) => void
}) => (
  <div className="flex flex-col items-center w-28 bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 gap-6 hover:bg-zinc-900/40 transition-colors group">
    <div className="flex flex-col items-center gap-2 w-full">
      <div className={cn("w-3 h-3 rounded-full shadow-lg", color)} />
      <span className="text-[11px] font-bold text-zinc-400 uppercase truncate w-full text-center group-hover:text-zinc-200 transition-colors">
        {name}
      </span>
    </div>

    {/* Pan */}
    <div className="flex flex-col items-center gap-2 w-full">
      <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">Pan</span>
      <input 
        type="range" 
        min="-1" 
        max="1" 
        step="0.1" 
        value={pan}
        onChange={(e) => onChange({ pan: parseFloat(e.target.value) })}
        className="w-full accent-orange-500 h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer hover:bg-zinc-800 transition-colors"
      />
      <div className="flex justify-between w-full text-[9px] text-zinc-700 font-mono font-bold">
        <span>L</span>
        <span>R</span>
      </div>
    </div>

    {/* Volume Fader */}
    <div className="flex-1 flex flex-col items-center gap-2 py-4 relative w-full">
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-zinc-900 rounded-full" />
      <input 
        type="range" 
        min="-60" 
        max="6" 
        step="1" 
        value={volume}
        onChange={(e) => onChange({ volume: parseFloat(e.target.value) })}
        className="h-48 -rotate-90 origin-center accent-orange-500 bg-transparent rounded-lg appearance-none cursor-pointer absolute top-1/2 -translate-y-1/2 z-10"
        style={{ width: '120px' }}
      />
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 flex flex-col justify-between py-1 opacity-10 pointer-events-none">
        {[...Array(12)].map((_, j) => (
          <div key={j} className="h-px bg-white w-full" />
        ))}
      </div>
    </div>

    {/* FX Sends */}
    <div className="flex flex-col gap-4 w-full pt-4 border-t border-zinc-800/50">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Wind className="w-3 h-3 text-blue-400" />
          <span className="text-[9px] text-zinc-600 uppercase font-bold">Verb</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={reverb}
          onChange={(e) => onChange({ reverb: parseFloat(e.target.value) })}
          className="w-full accent-blue-500 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Repeat className="w-3 h-3 text-green-400" />
          <span className="text-[9px] text-zinc-600 uppercase font-bold">Delay</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={delay}
          onChange={(e) => onChange({ delay: parseFloat(e.target.value) })}
          className="w-full accent-green-500 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>

    <div className="text-[11px] font-mono font-bold text-zinc-500 mt-1">
      {volume > -60 ? `${Math.round(volume)}dB` : '-∞'}
    </div>
  </div>
));

ChannelStrip.displayName = 'ChannelStrip';

export const Mixer = memo(() => {
  const tracks = useStore(state => state.tracks);
  const melodySettings = useStore(state => state.melodySettings);
  const updateTrackMixer = useStore(state => state.updateTrackMixer);
  const updateMelodyMixer = useStore(state => state.updateMelodyMixer);

  const handleTrackChange = useCallback((id: string, updates: Partial<Track>) => {
    updateTrackMixer(id, updates);
    audioEngine.updateChannelParams(id, updates);
  }, [updateTrackMixer]);

  const handleMelodyChange = useCallback((updates: Partial<typeof melodySettings>) => {
    updateMelodyMixer(updates);
    audioEngine.updateMelodyParams(updates);
  }, [updateMelodyMixer]);

  return (
    <div className="flex flex-col h-full daw-panel p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-zinc-100 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Sliders className="w-4 h-4 text-orange-500" />
            Mixer Console
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 rounded-lg border border-zinc-800/50 text-[10px] text-zinc-500 font-bold">
            <Activity className="w-3 h-3 text-green-500" />
            <span>Master Out: 0.0dB</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {tracks.map((track) => (
          <ChannelStrip 
            key={track.id}
            name={track.name}
            color={track.color}
            volume={track.volume}
            pan={track.pan}
            reverb={track.reverb}
            delay={track.delay}
            onChange={(updates) => handleTrackChange(track.id, updates)}
          />
        ))}

        <div className="w-px bg-zinc-800/50 mx-2" />

        <ChannelStrip 
          name="Melody"
          color="bg-orange-500"
          volume={melodySettings.volume}
          pan={melodySettings.pan}
          reverb={melodySettings.reverb}
          delay={melodySettings.delay}
          onChange={handleMelodyChange}
        />

        {/* Master Fader Placeholder */}
        <div className="flex flex-col items-center w-28 bg-zinc-900/20 border border-zinc-800/50 rounded-xl p-4 gap-6 ml-auto">
          <span className="text-[11px] font-bold text-orange-500 uppercase tracking-widest">Master</span>
          <div className="flex-1 flex flex-col items-center gap-2 py-4 relative w-full">
            <div className="h-full w-3 bg-zinc-950 rounded-full relative overflow-hidden border border-zinc-800/50">
              <motion.div 
                animate={{ height: "45%" }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 opacity-40 shadow-[0_0_10px_rgba(34,197,94,0.3)]" 
              />
            </div>
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-6 flex flex-col justify-between py-1 opacity-5 pointer-events-none">
              {[...Array(20)].map((_, j) => (
                <div key={j} className="h-px bg-white w-full" />
              ))}
            </div>
          </div>
          <Volume2 className="w-5 h-5 text-zinc-500" />
        </div>
      </div>
    </div>
  );
});

Mixer.displayName = 'Mixer';
