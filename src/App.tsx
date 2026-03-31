import React, { useEffect, useState, useRef, lazy, Suspense, useCallback, memo } from 'react';
import { Play, Square, Settings, Music, Layers, Sliders, Activity, Download, Save, FolderOpen, Trash2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PanelGroup, 
  Panel, 
  PanelResizeHandle 
} from 'react-resizable-panels';
import { useStore } from './store/useStore';
import { audioEngine } from './audio-engine/engine';
import { PersistenceService } from './services/persistenceService';
import { cn } from './utils/cn';

// Lazy load feature components
const StepSequencer = lazy(() => import('./features/sequencer/StepSequencer').then(m => ({ default: m.StepSequencer })));
const PianoRoll = lazy(() => import('./features/piano-roll/PianoRoll').then(m => ({ default: m.PianoRoll })));
const Mixer = lazy(() => import('./features/mixer/Mixer').then(m => ({ default: m.Mixer })));
const Timeline = lazy(() => import('./features/timeline/Timeline').then(m => ({ default: m.Timeline })));
const ExportDialog = lazy(() => import('./components/ExportDialog').then(m => ({ default: m.ExportDialog })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full bg-zinc-950/50 backdrop-blur-sm rounded-xl border border-zinc-800/50">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Loading Module...</span>
    </div>
  </div>
);

const TransportBar = memo(({ 
  onTogglePlayback, 
  onSave, 
  onLoad, 
  onReset, 
  onExport 
}: { 
  onTogglePlayback: () => void;
  onSave: () => void;
  onLoad: () => void;
  onReset: () => void;
  onExport: () => void;
}) => {
  const bpm = useStore(state => state.bpm);
  const isPlaying = useStore(state => state.isPlaying);
  const playbackMode = useStore(state => state.playbackMode);
  const setBpm = useStore(state => state.setBpm);
  const setPlaybackMode = useStore(state => state.setPlaybackMode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800 flex items-center px-4 justify-between shrink-0 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 group cursor-default">
          <motion.div 
            whileHover={{ rotate: 180 }}
            className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.2)]"
          >
            <Activity className="text-black w-5 h-5" />
          </motion.div>
          <span className="font-bold tracking-tighter text-xl italic bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">SONICFLOW</span>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
          <button
            onClick={onTogglePlayback}
            title="Play/Stop (Space)"
            className={cn(
              "p-2 rounded-md transition-all duration-200 hover:bg-zinc-800 active:scale-90",
              isPlaying ? "text-orange-500 bg-orange-500/10" : "text-zinc-400"
            )}
          >
            {isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
          <button
            onClick={() => setPlaybackMode('pattern')}
            title="Pattern Mode"
            className={cn(
              "px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all duration-200",
              playbackMode === 'pattern' ? "bg-zinc-700 text-orange-400 shadow-inner" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Pattern
          </button>
          <button
            onClick={() => setPlaybackMode('song')}
            title="Song Mode"
            className={cn(
              "px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all duration-200",
              playbackMode === 'song' ? "bg-zinc-700 text-orange-400 shadow-inner" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Song
          </button>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/50 group">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-orange-500 transition-colors">BPM</span>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="bg-transparent w-12 text-center font-mono text-sm focus:outline-none text-orange-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
          <button 
            onClick={onSave}
            className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-all"
            title="Save Project (JSON)"
          >
            <Save className="w-4 h-4" />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-all"
            title="Open Project"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button 
            onClick={onReset}
            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
            title="New Project / Reset"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                PersistenceService.loadProject(file).catch(err => alert(err.message));
              }
            }} 
            className="hidden" 
            accept=".json"
          />
        </div>

        <button 
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-black rounded-lg text-[10px] font-bold uppercase transition-all shadow-lg shadow-orange-500/20 active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
        
        <div className="h-8 w-px bg-zinc-800 mx-1" />

        <button className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-all">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden ring-2 ring-transparent hover:ring-orange-500/50 transition-all cursor-pointer">
          <img src="https://picsum.photos/seed/user/32/32" alt="User" referrerPolicy="no-referrer" />
        </div>
      </div>
    </header>
  );
});

TransportBar.displayName = 'TransportBar';

const BottomDock = memo(() => {
  const tracks = useStore(state => state.tracks);
  const isPlaying = useStore(state => state.isPlaying);

  return (
    <Panel defaultSize={25} minSize={10} className="bg-zinc-950 p-4 pt-0">
      <div className="h-full bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
        <div className="flex gap-3 h-full items-end">
          {tracks.map((track) => (
            <div key={track.id} className="w-14 h-full flex flex-col items-center justify-end gap-2 group">
              <div className="flex-1 w-full bg-zinc-950/50 rounded-md relative overflow-hidden border border-zinc-800/50">
                {isPlaying && (
                  <motion.div 
                    animate={{ height: ["20%", "80%", "40%", "90%", "30%"] }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                    className={cn("absolute bottom-0 left-0 right-0 opacity-40", track.color)} 
                  />
                )}
                {!isPlaying && (
                  <div className={cn("absolute bottom-0 left-0 right-0 h-[5%] opacity-20", track.color)} />
                )}
                <div className="absolute inset-0 flex flex-col justify-between p-1 opacity-20 pointer-events-none">
                  {[...Array(10)].map((_, j) => (
                    <div key={j} className="h-px bg-white/20 w-full" />
                  ))}
                </div>
              </div>
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter group-hover:text-zinc-300 transition-colors">{track.name}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Master Output</p>
            <div className="w-64 h-6 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative">
              <motion.div 
                animate={{ width: isPlaying ? "75%" : "2%" }}
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 opacity-60 shadow-[0_0_15px_rgba(34,197,94,0.2)]" 
              />
              <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none">
                {[...Array(8)].map((_, j) => (
                  <div key={j} className="w-px h-2 bg-white/10" />
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 text-[9px] font-mono text-zinc-600">
            <div className="flex gap-2">
              <span className="text-zinc-400">CPU</span>
              <span>12%</span>
            </div>
            <div className="flex gap-2">
              <span className="text-zinc-400">DISK</span>
              <span>2%</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
});

BottomDock.displayName = 'BottomDock';

export default function App() {
  const bpm = useStore(state => state.bpm);
  const isPlaying = useStore(state => state.isPlaying);
  const activePanel = useStore(state => state.activePanel);
  const playbackMode = useStore(state => state.playbackMode);
  const tracks = useStore(state => state.tracks);
  const patterns = useStore(state => state.patterns);
  const arrangement = useStore(state => state.arrangement);
  const melodySettings = useStore(state => state.melodySettings);
  const gridSize = useStore(state => state.gridSize);
  const activePatternId = useStore(state => state.activePatternId);
  
  const setBpm = useStore(state => state.setBpm);
  const setIsPlaying = useStore(state => state.setIsPlaying);
  const setActivePanel = useStore(state => state.setActivePanel);
  const setPlaybackMode = useStore(state => state.setPlaybackMode);
  const resetProject = useStore(state => state.resetProject);

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize panels to avoid recreation
  const panels = React.useMemo(() => [
    { id: 'timeline', name: 'Timeline', icon: Layers, component: Timeline },
    { id: 'sequencer', name: 'Sequencer', icon: Activity, component: StepSequencer },
    { id: 'piano-roll', name: 'Piano Roll', icon: Music, component: PianoRoll },
    { id: 'mixer', name: 'Mixer', icon: Sliders, component: Mixer },
  ], []);

  const handleTogglePlayback = useCallback(async () => {
    if (!isPlaying) {
      await audioEngine.start();
    }
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    audioEngine.togglePlayback(newIsPlaying, playbackMode);
  }, [isPlaying, playbackMode, setIsPlaying]);

  const handleSaveProject = useCallback(() => {
    PersistenceService.saveProject();
  }, []);

  const handleLoadProject = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      PersistenceService.loadProject(file).catch(err => alert(err.message));
    }
  }, []);

  const handleResetProject = useCallback(() => {
    if (confirm('Are you sure you want to reset the project? All unsaved changes will be lost.')) {
      resetProject();
      audioEngine.reinitialize();
    }
  }, [resetProject]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        handleTogglePlayback();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlayback]);

  // Load auto-save on mount
  useEffect(() => {
    PersistenceService.loadAutoSave();
  }, []);

  // Auto-save on state changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      PersistenceService.autoSave();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [bpm, tracks, patterns, arrangement, melodySettings, gridSize, activePatternId]);

  useEffect(() => {
    audioEngine.setBpm(bpm);
  }, [bpm]);

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-100 overflow-hidden font-sans selection:bg-orange-500/30">
      {/* Transport Bar */}
      <TransportBar 
        onTogglePlayback={handleTogglePlayback}
        onSave={handleSaveProject}
        onLoad={() => {}} // Handled internally
        onReset={handleResetProject}
        onExport={() => setIsExportDialogOpen(true)}
      />

      <main className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Sidebar Navigation */}
          <Panel 
            defaultSize={4} 
            minSize={4} 
            maxSize={10} 
            collapsible={true}
            onCollapse={() => setIsSidebarCollapsed(true)}
            onExpand={() => setIsSidebarCollapsed(false)}
            className="bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-4 gap-4 shrink-0 z-40"
          >
            <div className="flex flex-col items-center gap-4 w-full px-2">
              {panels.map((panel) => {
                const Icon = panel.icon;
                const isActive = activePanel === panel.id;
                return (
                  <button
                    key={panel.id}
                    onClick={() => setActivePanel(panel.id)}
                    className={cn(
                      "w-full aspect-square rounded-xl transition-all duration-300 group relative flex items-center justify-center",
                      isActive 
                        ? "bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.3)]" 
                        : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
                    )}
                    title={panel.name}
                  >
                    <Icon className={cn("w-6 h-6 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                    {!isSidebarCollapsed && isActive && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full" 
                      />
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-auto pb-4">
               <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 text-zinc-600 hover:text-zinc-400 transition-colors"
               >
                 {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
               </button>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-transparent hover:bg-orange-500/20 transition-colors cursor-col-resize" />

          {/* Workspace Area */}
          <Panel defaultSize={96} className="flex flex-col overflow-hidden">
            <PanelGroup direction="vertical">
              <Panel defaultSize={75} className="bg-zinc-950 p-4 overflow-hidden relative">
                <Suspense fallback={<LoadingFallback />}>
                  <AnimatePresence mode="wait">
                    {panels.map((panel) => activePanel === panel.id && (
                      <motion.div
                        key={panel.id}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute inset-4 overflow-hidden"
                      >
                        <panel.component />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </Suspense>
              </Panel>

              <PanelResizeHandle className="h-1 bg-transparent hover:bg-orange-500/20 transition-colors cursor-row-resize" />

              {/* Bottom Dock (Mini Mixer or Info) */}
              <BottomDock />
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-6 bg-zinc-900 border-t border-zinc-800 text-zinc-500 px-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider shrink-0">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", isPlaying ? "bg-green-500 animate-pulse" : "bg-zinc-700")} />
            <span>Engine: {isPlaying ? 'Running' : 'Idle'}</span>
          </div>
          <span>Sample Rate: 44.1kHz</span>
          <span>Latency: 12ms</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-zinc-600">Project: Untitled_Beat_01</span>
          <span className="text-orange-500/80">SonicFlow v0.1.0-alpha</span>
        </div>
      </footer>

      {isExportDialogOpen && (
        <Suspense fallback={null}>
          <ExportDialog onClose={() => setIsExportDialogOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
