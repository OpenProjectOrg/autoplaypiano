import { PianoSoundPreset, pianoSynth } from "./piano-synth";

export interface PianoSettings {
  transpose: number;
  sustain: boolean;
  preset: PianoSoundPreset;
  showKeyLabels: boolean;
  showNoteNames: boolean;
  showVirtualPiano: boolean;
  speedMultiplier: number;
  countdownSec: number;
  isAudioMuted: boolean;
}

export const DEFAULT_PIANO_SETTINGS: PianoSettings = {
  transpose: 0,
  sustain: true,
  preset: "grand",
  showKeyLabels: true,
  showNoteNames: false,
  showVirtualPiano: true,
  speedMultiplier: 1.0,
  countdownSec: 3,
  isAudioMuted: true,
};

const LOCAL_STORAGE_SETTINGS_KEY = "autopiano_piano_settings";

export function loadPianoSettings(): PianoSettings {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged: PianoSettings = {
        ...DEFAULT_PIANO_SETTINGS,
        ...parsed,
      };
      // Ensure valid numbers and bounds
      merged.transpose = Math.max(-12, Math.min(12, Number(merged.transpose) || 0));
      merged.speedMultiplier = Number(merged.speedMultiplier) || 1.0;
      merged.countdownSec = Number(merged.countdownSec) ?? 3;

      // Sync with audio engine
      pianoSynth.transpose = merged.transpose;
      pianoSynth.sustain = merged.sustain;
      pianoSynth.preset = merged.preset;
      pianoSynth.isMuted = merged.isAudioMuted;

      return merged;
    }
  } catch (err) {
    console.warn("Failed to load piano settings from localStorage:", err);
  }

  // Fallback to default
  pianoSynth.transpose = DEFAULT_PIANO_SETTINGS.transpose;
  pianoSynth.sustain = DEFAULT_PIANO_SETTINGS.sustain;
  pianoSynth.preset = DEFAULT_PIANO_SETTINGS.preset;
  pianoSynth.isMuted = DEFAULT_PIANO_SETTINGS.isAudioMuted;

  return { ...DEFAULT_PIANO_SETTINGS };
}

export function savePianoSettings(partial: Partial<PianoSettings>): PianoSettings {
  let current: PianoSettings;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    current = raw ? { ...DEFAULT_PIANO_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_PIANO_SETTINGS };
  } catch {
    current = { ...DEFAULT_PIANO_SETTINGS };
  }

  const updated: PianoSettings = {
    ...current,
    ...partial,
  };

  // Bound checks & engine sync
  if (updated.transpose !== undefined) {
    updated.transpose = Math.max(-12, Math.min(12, Number(updated.transpose) || 0));
    pianoSynth.transpose = updated.transpose;
  }
  if (updated.sustain !== undefined) {
    pianoSynth.sustain = Boolean(updated.sustain);
  }
  if (updated.preset !== undefined) {
    pianoSynth.preset = updated.preset;
  }
  if (updated.isAudioMuted !== undefined) {
    pianoSynth.isMuted = Boolean(updated.isAudioMuted);
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save piano settings to localStorage:", err);
  }

  return updated;
}
