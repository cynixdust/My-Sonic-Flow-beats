import React, { useState, memo, useCallback, useMemo } from 'react';
import { useStore, Pattern } from '../../store/useStore';
import { cn } from '../../utils/cn';
import { LayoutGrid, Plus, Trash2, Layers, Music, Play, Square } from 'lucide-react';
import { motion } from 'motion/react';

const ArrangementItem = memo(({ 
  item, 
  pattern, 
  isDragging, 
  onMouseDown, 
  onRemove 
}: { 
  item: any, 
  pattern: Pattern | undefined, 
  isDragging: boolean, 
  onMouseDown: (e: React.MouseEvent, item: any) => void,
  onRemove: (id: string) => void
}) => {
  if (!pattern) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onMouseDown={(e) => onMouseDown(e, item)}
      className={cn(
        "absolute h-14 top-6 rounded-lg border border-white/20 shadow-xl flex items-center px-4 group cursor-pointer transition-all",
        pattern.color,
        isDragging ? "z-40 opacity-80 shadow-2xl scale-105" : "z-20 hover:brightness-110"
      )}
      style={{ 
        left: `${item.startTime * 20}px`,
        width: `${64 * 20}px`
      }}
    >
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-white uppercase tracking-widest drop-shadow-md">
          {pattern.name}
        </span>
        <span className="text-[8px] text-white/60 font-mono uppercase">
          Bar {Math.floor(item.startTime / 16) + 1}
        </span>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="ml-auto opacity-0 group-hover:opacity-100 text-white/50 hover:text-white transition-all bg-black/20 p-1.5 rounded-md"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
});

ArrangementItem.displayName = 'ArrangementItem';

const PatternSidebarItem = memo(({ 
  p, 
  isActive, 
  onSelect, 
  onUpdateName, 
  onRemove,
  canRemove
}: { 
  p: Pattern, 
  isActive: boolean, 
  onSelect: (id: string) => void,
  onUpdateName: (id: string, name: string) => void,
  onRemove: (id: string) => void,
  canRemove: boolean
}) => (
  <motion.div 
    whileHover={{ x: 4 }}
    onClick={() => onSelect(p.id)}
    className={cn(
      "p-3 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
      isActive 
        ? "bg-zinc-900/80 border-zinc-700 shadow-lg" 
        : "bg-zinc-950/40 border-transparent hover:border-zinc-800 hover:bg-zinc-900/40"
    )}
  >
    <div className="flex items-center gap-3 relative z-10">
      <div className={cn("w-2.5 h-2.5 rounded-full shadow-lg", p.color)} />
      <input 
        className="bg-transparent text-[11px] font-bold text-zinc-300 focus:outline-none w-full cursor-pointer focus:cursor-text"
        value={p.name}
        onChange={(e) => onUpdateName(p.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
    {isActive && (
      <div className={cn("absolute inset-y-0 left-0 w-1", p.color)} />
    )}
    {canRemove && (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onRemove(p.id);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all z-20"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )}
  </motion.div>
));

PatternSidebarItem.displayName = 'PatternSidebarItem';

const Playhead = memo(() => {
  const currentStep = useStore(state => state.currentStep);
  const playbackMode = useStore(state => state.playbackMode);
  
  if (playbackMode !== 'song') return null;

  return (
    <div 
      className="absolute top-0 bottom-0 w-px bg-white z-30 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]"
      style={{ left: `${currentStep * 20}px` }}
    />
  );
});

Playhead.displayName = 'Playhead';

export const Timeline = memo(() => {
  const patterns = useStore(state => state.patterns);
  const arrangement = useStore(state => state.arrangement);
  const activePatternId = useStore(state => state.activePatternId);
  const playbackMode = useStore(state => state.playbackMode);
  const setActivePatternId = useStore(state => state.setActivePatternId);
  const setPlaybackMode = useStore(state => state.setPlaybackMode);
  const addToArrangement = useStore(state => state.addToArrangement);
  const removeFromArrangement = useStore(state => state.removeFromArrangement);
  const updateArrangementItem = useStore(state => state.updateArrangementItem);
  const clearArrangement = useStore(state => state.clearArrangement);
  const addPattern = useStore(state => state.addPattern);
  const removePattern = useStore(state => state.removePattern);
  const updatePatternName = useStore(state => state.updatePatternName);

  const [hoverStep, setHoverStep] = useState<number | null>(null);
  const [draggingItem, setDraggingItem] = useState<{ id: string, startX: number, originalStartTime: number } | null>(null);

  const totalBars = useMemo(() => {
    const maxStep = arrangement.length > 0 ? Math.max(...arrangement.map(a => a.startTime + 64)) : 0;
    return Math.ceil(maxStep / 16);
  }, [arrangement]);

  const handleTimelineClick = useCallback((step: number) => {
    if (draggingItem) return;
    const barStep = Math.floor(step / 16) * 16;
    const existing = arrangement.find(a => a.startTime === barStep);
    if (!existing) {
      addToArrangement(activePatternId, barStep);
    }
  }, [draggingItem, arrangement, activePatternId, addToArrangement]);

  const handleMouseDown = useCallback((e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setDraggingItem({
      id: item.id,
      startX: e.clientX,
      originalStartTime: item.startTime
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const step = Math.floor(x / 20);
    setHoverStep(step);

    if (draggingItem) {
      const deltaX = e.clientX - draggingItem.startX;
      const deltaSteps = Math.round(deltaX / 20);
      const newStartTime = Math.max(0, Math.floor((draggingItem.originalStartTime + deltaSteps) / 16) * 16);
      
      const currentItem = arrangement.find(a => a.id === draggingItem.id);
      if (currentItem && newStartTime !== currentItem.startTime) {
        updateArrangementItem(draggingItem.id, { startTime: newStartTime });
      }
    }
  }, [draggingItem, arrangement, updateArrangementItem]);

  const handleMouseUp = useCallback(() => {
    setDraggingItem(null);
  }, []);

  return (
    <div className="flex flex-col h-full daw-panel overflow-hidden select-none">
      {/* Header */}
      <div className="h-14 border-b border-zinc-800/50 flex items-center px-6 justify-between bg-zinc-950/40">
        <div className="flex items-center gap-6">
          <h2 className="text-zinc-100 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-500" />
            Song Arranger
          </h2>
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800/50 shadow-inner">
            <button 
              onClick={() => setPlaybackMode('pattern')}
              className={cn(
                "px-4 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-2",
                playbackMode === 'pattern' ? "bg-zinc-800 text-orange-500 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Square className="w-2.5 h-2.5" />
              Pattern
            </button>
            <button 
              onClick={() => setPlaybackMode('song')}
              className={cn(
                "px-4 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-2",
                playbackMode === 'song' ? "bg-zinc-800 text-orange-500 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Play className="w-2.5 h-2.5" />
              Song
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-zinc-800/50">
            Song Length: <span className="text-orange-500">{totalBars} Bars</span>
          </div>
          <button 
            onClick={clearArrangement}
            className="daw-button text-zinc-400 hover:text-red-500 text-[11px] px-4"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Clear All
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Pattern List Sidebar */}
        <div className="w-56 bg-zinc-950/60 border-r border-zinc-800/50 flex flex-col p-5 gap-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Patterns</span>
            <button 
              onClick={addPattern}
              className="p-1.5 hover:bg-zinc-800 rounded-md text-orange-500 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {patterns.map((p) => (
              <PatternSidebarItem
                key={p.id}
                p={p}
                isActive={activePatternId === p.id}
                onSelect={setActivePatternId}
                onUpdateName={updatePatternName}
                onRemove={removePattern}
                canRemove={patterns.length > 1}
              />
            ))}
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 overflow-auto custom-scrollbar relative bg-zinc-900/20">
          <Playhead />

          <div 
            className="relative h-full min-w-full"
            style={{ 
              width: '8192px',
              backgroundImage: 'linear-gradient(to right, #3f3f46 1px, transparent 1px)',
              backgroundSize: '20px 100%'
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              setHoverStep(null);
              setDraggingItem(null);
            }}
            onMouseUp={handleMouseUp}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              handleTimelineClick(Math.floor(x / 20));
            }}
          >
            {/* Sub-grid lines (bars/beats) */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: 'linear-gradient(to right, #71717a 1px, transparent 1px), linear-gradient(to right, #a1a1aa 1px, transparent 1px)',
                backgroundSize: '80px 100%, 320px 100%'
              }}
            />

            {/* Arrangement Items */}
            {arrangement.map((item) => (
              <ArrangementItem
                key={item.id}
                item={item}
                pattern={patterns.find(p => p.id === item.patternId)}
                isDragging={draggingItem?.id === item.id}
                onMouseDown={handleMouseDown}
                onRemove={removeFromArrangement}
              />
            ))}

            {/* Hover Indicator */}
            {hoverStep !== null && !draggingItem && (
              <div 
                className="absolute h-14 top-6 bg-white/5 border border-dashed border-white/20 rounded-lg pointer-events-none"
                style={{ 
                  left: `${Math.floor(hoverStep / 16) * 16 * 20}px`,
                  width: `${64 * 20}px`
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="h-10 bg-zinc-950/60 border-t border-zinc-800/50 flex items-center px-6 justify-between text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
        <div className="flex gap-6">
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            Arrangement: {arrangement.length} blocks
          </span>
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            Mode: {playbackMode}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
          <span className="text-zinc-400">Timeline Sync OK</span>
        </div>
      </div>
    </div>
  );
});

Timeline.displayName = 'Timeline';
