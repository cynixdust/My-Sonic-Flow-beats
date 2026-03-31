import React, { useState } from 'react';
import { X, Download, Loader2, FileAudio, CheckCircle2 } from 'lucide-react';
import { ExportService, ExportOptions } from '../services/exportService';
import { cn } from '../utils/cn';

interface ExportDialogProps {
  onClose: () => void;
}

export const ExportDialog = ({ onClose }: ExportDialogProps) => {
  const [format, setFormat] = useState<'wav' | 'mp3'>('mp3');
  const [bitrate, setBitrate] = useState<number>(192);
  const [isExporting, setIsExporting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const options: ExportOptions = {
        format,
        bitrate: format === 'mp3' ? bitrate : undefined
      };
      
      const blob = await ExportService.renderSong(options);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sonicflow-track-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsFinished(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.message || 'Export failed. Make sure you have patterns in your arrangement.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-orange-500" />
            <h2 className="text-zinc-100 font-bold uppercase tracking-widest text-sm">Export Track</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          {!isFinished ? (
            <>
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormat('mp3')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-lg border font-bold text-xs transition-all",
                      format === 'mp3' 
                        ? "bg-orange-500/10 border-orange-500 text-orange-500" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    )}
                  >
                    <FileAudio className="w-4 h-4" />
                    MP3
                  </button>
                  <button
                    onClick={() => setFormat('wav')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-lg border font-bold text-xs transition-all",
                      format === 'wav' 
                        ? "bg-orange-500/10 border-orange-500 text-orange-500" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    )}
                  >
                    <FileAudio className="w-4 h-4" />
                    WAV
                  </button>
                </div>
              </div>

              {format === 'mp3' && (
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Bitrate (kbps)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[128, 192, 256, 320].map((br) => (
                      <button
                        key={br}
                        onClick={() => setBitrate(br)}
                        className={cn(
                          "py-2 rounded border font-mono text-[10px] transition-all",
                          bitrate === br 
                            ? "bg-zinc-800 border-zinc-600 text-orange-400" 
                            : "bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700"
                        )}
                      >
                        {br}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded text-[10px] text-red-500 font-bold uppercase">
                  {error}
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={isExporting}
                className={cn(
                  "w-full py-4 rounded-lg font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2",
                  isExporting 
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                    : "bg-orange-500 hover:bg-orange-600 text-black shadow-lg shadow-orange-500/20"
                )}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Rendering...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Start Export
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div className="text-center">
                <h3 className="text-zinc-100 font-bold uppercase tracking-widest">Export Complete</h3>
                <p className="text-zinc-500 text-[10px] mt-1 uppercase font-bold">Your track has been downloaded</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950/50 border-t border-zinc-800 text-[10px] text-zinc-600 font-bold uppercase text-center">
          SonicFlow Offline Renderer v1.0
        </div>
      </div>
    </div>
  );
};
