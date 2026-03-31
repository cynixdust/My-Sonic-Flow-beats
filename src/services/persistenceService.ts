import { useStore } from '../store/useStore';
import { audioEngine } from '../audio-engine/engine';

export class PersistenceService {
  private static STORAGE_KEY = 'sonicflow_autosave';

  public static saveProject() {
    const state = useStore.getState();
    const projectData = {
      bpm: state.bpm,
      gridSize: state.gridSize,
      tracks: state.tracks,
      patterns: state.patterns,
      arrangement: state.arrangement,
      melodySettings: state.melodySettings,
      activePatternId: state.activePatternId,
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sonicflow-project-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public static async loadProject(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target?.result as string);
          useStore.getState().loadProject(project);
          audioEngine.reinitialize();
          resolve();
        } catch (err) {
          reject(new Error('Invalid project file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  public static autoSave() {
    const state = useStore.getState();
    const projectData = {
      bpm: state.bpm,
      gridSize: state.gridSize,
      tracks: state.tracks,
      patterns: state.patterns,
      arrangement: state.arrangement,
      melodySettings: state.melodySettings,
      activePatternId: state.activePatternId,
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projectData));
  }

  public static loadAutoSave() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const project = JSON.parse(saved);
        useStore.getState().loadProject(project);
        audioEngine.reinitialize();
      } catch (err) {
        console.error('Failed to load auto-save:', err);
      }
    }
  }
}
