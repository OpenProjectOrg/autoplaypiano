// ============================================================================
// High-Fidelity Acoustic Concert Grand Piano Sound Engine
// Inspired by Recursive Arts Virtual Piano & Physical Modeling Acoustic Synthesis
// Features: Multi-harmonic string resonance, percussive felt hammer transients,
// stereo concert hall convolution reverb, adjustable sustain pedal, and transpose.
// 100% offline & zero external network latency.
// ============================================================================

export type PianoSoundPreset = "grand" | "bright" | "electric" | "harpsichord";

export interface NoteInfo {
  char: string;
  noteName: string;
  scientificNote: string;
  freq: number;
  transposedFreq: number;
  isBlack: boolean;
  octave: number;
}

// 61-Key Virtual Piano standard mapping (C3 to C8)
export const VIRTUAL_PIANO_KEY_DATA: Record<
  string,
  { noteName: string; scientificNote: string; baseFreq: number; isBlack: boolean; octave: number }
> = {
  // Octave 3 (Low Bass)
  "1": { noteName: "C", scientificNote: "C3", baseFreq: 130.81, isBlack: false, octave: 3 },
  "!": { noteName: "C#", scientificNote: "C#3", baseFreq: 138.59, isBlack: true, octave: 3 },
  "2": { noteName: "D", scientificNote: "D3", baseFreq: 146.83, isBlack: false, octave: 3 },
  "@": { noteName: "D#", scientificNote: "D#3", baseFreq: 155.56, isBlack: true, octave: 3 },
  "3": { noteName: "E", scientificNote: "E3", baseFreq: 164.81, isBlack: false, octave: 3 },
  "4": { noteName: "F", scientificNote: "F3", baseFreq: 174.61, isBlack: false, octave: 3 },
  "$": { noteName: "F#", scientificNote: "F#3", baseFreq: 185.0, isBlack: true, octave: 3 },
  "5": { noteName: "G", scientificNote: "G3", baseFreq: 196.0, isBlack: false, octave: 3 },
  "%": { noteName: "G#", scientificNote: "G#3", baseFreq: 207.65, isBlack: true, octave: 3 },
  "6": { noteName: "A", scientificNote: "A3", baseFreq: 220.0, isBlack: false, octave: 3 },
  "^": { noteName: "A#", scientificNote: "A#3", baseFreq: 233.08, isBlack: true, octave: 3 },
  "7": { noteName: "B", scientificNote: "B3", baseFreq: 246.94, isBlack: false, octave: 3 },

  // Octave 4 (Middle Octave - C4 to B4)
  "8": { noteName: "C", scientificNote: "C4", baseFreq: 261.63, isBlack: false, octave: 4 },
  "*": { noteName: "C#", scientificNote: "C#4", baseFreq: 277.18, isBlack: true, octave: 4 },
  "9": { noteName: "D", scientificNote: "D4", baseFreq: 293.66, isBlack: false, octave: 4 },
  "(": { noteName: "D#", scientificNote: "D#4", baseFreq: 311.13, isBlack: true, octave: 4 },
  "0": { noteName: "E", scientificNote: "E4", baseFreq: 329.63, isBlack: false, octave: 4 },
  "q": { noteName: "F", scientificNote: "F4", baseFreq: 349.23, isBlack: false, octave: 4 },
  "Q": { noteName: "F#", scientificNote: "F#4", baseFreq: 369.99, isBlack: true, octave: 4 },
  "w": { noteName: "G", scientificNote: "G4", baseFreq: 392.0, isBlack: false, octave: 4 },
  "W": { noteName: "G#", scientificNote: "G#4", baseFreq: 415.3, isBlack: true, octave: 4 },
  "e": { noteName: "A", scientificNote: "A4", baseFreq: 440.0, isBlack: false, octave: 4 },
  "E": { noteName: "A#", scientificNote: "A#4", baseFreq: 466.16, isBlack: true, octave: 4 },
  "r": { noteName: "B", scientificNote: "B4", baseFreq: 493.88, isBlack: false, octave: 4 },

  // Octave 5 (Treble Octave - C5 to B5)
  "t": { noteName: "C", scientificNote: "C5", baseFreq: 523.25, isBlack: false, octave: 5 },
  "T": { noteName: "C#", scientificNote: "C#5", baseFreq: 554.37, isBlack: true, octave: 5 },
  "y": { noteName: "D", scientificNote: "D5", baseFreq: 587.33, isBlack: false, octave: 5 },
  "Y": { noteName: "D#", scientificNote: "D#5", baseFreq: 622.25, isBlack: true, octave: 5 },
  "u": { noteName: "E", scientificNote: "E5", baseFreq: 659.25, isBlack: false, octave: 5 },
  "i": { noteName: "F", scientificNote: "F5", baseFreq: 698.46, isBlack: false, octave: 5 },
  "I": { noteName: "F#", scientificNote: "F#5", baseFreq: 739.99, isBlack: true, octave: 5 },
  "o": { noteName: "G", scientificNote: "G5", baseFreq: 783.99, isBlack: false, octave: 5 },
  "O": { noteName: "G#", scientificNote: "G#5", baseFreq: 830.61, isBlack: true, octave: 5 },
  "p": { noteName: "A", scientificNote: "A5", baseFreq: 880.0, isBlack: false, octave: 5 },
  "P": { noteName: "A#", scientificNote: "A#5", baseFreq: 932.33, isBlack: true, octave: 5 },
  "a": { noteName: "B", scientificNote: "B5", baseFreq: 987.77, isBlack: false, octave: 5 },

  // Octave 6 (High Treble - C6 to B6)
  "s": { noteName: "C", scientificNote: "C6", baseFreq: 1046.5, isBlack: false, octave: 6 },
  "S": { noteName: "C#", scientificNote: "C#6", baseFreq: 1108.73, isBlack: true, octave: 6 },
  "d": { noteName: "D", scientificNote: "D6", baseFreq: 1174.66, isBlack: false, octave: 6 },
  "D": { noteName: "D#", scientificNote: "D#6", baseFreq: 1244.51, isBlack: true, octave: 6 },
  "f": { noteName: "E", scientificNote: "E6", baseFreq: 1318.51, isBlack: false, octave: 6 },
  "g": { noteName: "F", scientificNote: "F6", baseFreq: 1396.91, isBlack: false, octave: 6 },
  "G": { noteName: "F#", scientificNote: "F#6", baseFreq: 1479.98, isBlack: true, octave: 6 },
  "h": { noteName: "G", scientificNote: "G6", baseFreq: 1567.98, isBlack: false, octave: 6 },
  "H": { noteName: "G#", scientificNote: "G#6", baseFreq: 1661.22, isBlack: true, octave: 6 },
  "j": { noteName: "A", scientificNote: "A6", baseFreq: 1760.0, isBlack: false, octave: 6 },
  "J": { noteName: "A#", scientificNote: "A#6", baseFreq: 1864.66, isBlack: true, octave: 6 },
  "k": { noteName: "B", scientificNote: "B6", baseFreq: 1975.53, isBlack: false, octave: 6 },

  // Octave 7 & Top C8
  "l": { noteName: "C", scientificNote: "C7", baseFreq: 2093.0, isBlack: false, octave: 7 },
  "L": { noteName: "C#", scientificNote: "C#7", baseFreq: 2217.46, isBlack: true, octave: 7 },
  "z": { noteName: "D", scientificNote: "D7", baseFreq: 2349.32, isBlack: false, octave: 7 },
  "Z": { noteName: "D#", scientificNote: "D#7", baseFreq: 2489.02, isBlack: true, octave: 7 },
  "x": { noteName: "E", scientificNote: "E7", baseFreq: 2637.02, isBlack: false, octave: 7 },
  "c": { noteName: "F", scientificNote: "F7", baseFreq: 2793.83, isBlack: false, octave: 7 },
  "C": { noteName: "F#", scientificNote: "F#7", baseFreq: 2959.96, isBlack: true, octave: 7 },
  "v": { noteName: "G", scientificNote: "G7", baseFreq: 3135.96, isBlack: false, octave: 7 },
  "V": { noteName: "G#", scientificNote: "G#7", baseFreq: 3322.44, isBlack: true, octave: 7 },
  "b": { noteName: "A", scientificNote: "A7", baseFreq: 3520.0, isBlack: false, octave: 7 },
  "B": { noteName: "A#", scientificNote: "A#7", baseFreq: 3729.31, isBlack: true, octave: 7 },
  "n": { noteName: "B", scientificNote: "B7", baseFreq: 3951.07, isBlack: false, octave: 7 },
  "m": { noteName: "C", scientificNote: "C8", baseFreq: 4186.01, isBlack: false, octave: 8 },
};

class PianoSynth {
  private ctx: AudioContext | null = null;
  // Default is muted to prevent collision with Roblox audio output
  public isMuted: boolean = true;
  public sustain: boolean = true;
  public transpose: number = 0; // -12 to +12 semitones
  public preset: PianoSoundPreset = "grand";

  private masterGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private wetGain: GainNode | null = null;
  private dryGain: GainNode | null = null;

  private activeAudioNodes: Array<{ stop: () => void }> = [];
  private noteListeners: Array<(info: NoteInfo) => void> = [];

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Reverb Bus (Convolver simulation of a wooden concert piano hall)
      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this.buildConcertHallImpulse(2.5, 2.4);

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.convolver.connect(this.wetGain);
      this.wetGain.connect(this.masterGain);

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.dryGain.connect(this.masterGain);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Generate synthetic stereo concert hall impulse response
  private buildConcertHallImpulse(durationSec: number = 2.0, decay: number = 2.5): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * durationSec;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = Math.exp(-t * decay);
      // Discrete early reflection simulation + smooth diffuse tail
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulse;
  }

  public stopAll() {
    for (const item of this.activeAudioNodes) {
      try {
        item.stop();
      } catch {
        // node already ended
      }
    }
    this.activeAudioNodes = [];
    if (this.ctx && this.ctx.state === "running") {
      try {
        this.ctx.suspend();
      } catch {
        // ignore
      }
    }
  }

  public resumeAudio() {
    if (this.ctx && this.ctx.state === "suspended") {
      try {
        this.ctx.resume();
      } catch {
        // ignore
      }
    }
  }

  public addNoteListener(cb: (info: NoteInfo) => void) {
    this.noteListeners.push(cb);
    return () => {
      this.noteListeners = this.noteListeners.filter((fn) => fn !== cb);
    };
  }

  private notifyNote(info: NoteInfo) {
    for (const listener of this.noteListeners) {
      try {
        listener(info);
      } catch (err) {
        console.warn("Error in note listener:", err);
      }
    }
  }

  // Look up note info and calculate transposed frequency
  public getNoteInfo(char: string): NoteInfo {
    const data = VIRTUAL_PIANO_KEY_DATA[char] || {
      noteName: "A",
      scientificNote: "A4",
      baseFreq: 440.0,
      isBlack: false,
      octave: 4,
    };

    // Semitone transposition: f * 2^(transpose / 12)
    const factor = Math.pow(2, this.transpose / 12);
    const transposedFreq = data.baseFreq * factor;

    // Transposed note name calculation
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const baseIndex = noteNames.indexOf(data.noteName);
    let transposedNoteName = data.noteName;
    let transposedOctave = data.octave;

    if (baseIndex !== -1 && this.transpose !== 0) {
      const rawIndex = baseIndex + this.transpose;
      const modIndex = ((rawIndex % 12) + 12) % 12;
      transposedNoteName = noteNames[modIndex];
      transposedOctave += Math.floor(rawIndex / 12);
    }

    return {
      char,
      noteName: transposedNoteName,
      scientificNote: `${transposedNoteName}${transposedOctave}`,
      freq: data.baseFreq,
      transposedFreq,
      isBlack: data.isBlack,
      octave: transposedOctave,
    };
  }

  public playNote(c: string, durationSec: number = 0.5, forceSound: boolean = false) {
    if (this.isMuted && !forceSound) return;

    const noteInfo = this.getNoteInfo(c);
    this.notifyNote(noteInfo);

    try {
      this.initCtx();
      if (!this.ctx || !this.dryGain || !this.convolver) return;

      const now = this.ctx.currentTime;
      const freq = noteInfo.transposedFreq;

      // Stereo Panning (simulate acoustic pianist position: bass left, treble right)
      const panner = this.ctx.createStereoPanner
        ? this.ctx.createStereoPanner()
        : null;
      if (panner) {
        // Range from -0.35 (C3 bass) to +0.35 (C8 treble)
        const panValue = Math.min(0.4, Math.max(-0.4, ((freq - 440) / 1600) * 0.4));
        panner.pan.setValueAtTime(panValue, now);
      }

      // Wooden Soundboard Filter (Warm lowpass with gentle body resonance)
      const soundboard = this.ctx.createBiquadFilter();
      soundboard.type = "lowpass";
      const filterCutoff = this.preset === "bright" ? 4800 : this.preset === "electric" ? 2200 : 3200;
      soundboard.frequency.setValueAtTime(filterCutoff, now);
      soundboard.Q.setValueAtTime(0.85, now);

      // Warm Acoustic Body Formant Filter (Emulates 9-foot wooden piano rim warmth)
      const bodyFilter = this.ctx.createBiquadFilter();
      bodyFilter.type = "peaking";
      bodyFilter.frequency.setValueAtTime(360, now);
      bodyFilter.Q.setValueAtTime(1.2, now);
      bodyFilter.gain.setValueAtTime(3.5, now);

      // Main Voice Gain
      const voiceGain = this.ctx.createGain();
      voiceGain.gain.setValueAtTime(0, now);

      // Connect Voice -> Soundboard -> BodyFilter -> Panner -> Wet (Convolver) + Dry
      voiceGain.connect(soundboard);
      soundboard.connect(bodyFilter);
      if (panner) {
        bodyFilter.connect(panner);
        panner.connect(this.dryGain);
        panner.connect(this.convolver);
      } else {
        bodyFilter.connect(this.dryGain);
        bodyFilter.connect(this.convolver);
      }

      // Melodic Acoustic Piano Envelope (Smooth singing tone with natural decay)
      const effectiveDecay = this.sustain ? Math.max(durationSec * 3.0, 3.2) : Math.max(durationSec, 0.75);
      const strikeGain = this.preset === "harpsichord" ? 0.22 : 0.26;

      voiceGain.gain.linearRampToValueAtTime(strikeGain, now + 0.007);
      voiceGain.gain.exponentialRampToValueAtTime(0.0003, now + effectiveDecay);

      // ======================================================================
      // 1. Multi-Harmonic String Oscillators with Trichord Acoustic Detuning
      // ======================================================================
      const harmonicProfiles: Record<PianoSoundPreset, Array<{ mult: number; gain: number; type: OscillatorType }>> = {
        grand: [
          { mult: 1.0, gain: 0.9, type: "sine" },
          { mult: 2.0, gain: 0.42, type: "sine" },
          { mult: 3.0, gain: 0.22, type: "sine" },
          { mult: 4.0, gain: 0.09, type: "sine" },
          { mult: 5.0, gain: 0.04, type: "sine" },
        ],
        bright: [
          { mult: 1.0, gain: 0.85, type: "triangle" },
          { mult: 2.0, gain: 0.6, type: "sine" },
          { mult: 3.0, gain: 0.32, type: "triangle" },
          { mult: 4.0, gain: 0.18, type: "sine" },
          { mult: 5.0, gain: 0.08, type: "sine" },
        ],
        electric: [
          { mult: 1.0, gain: 1.0, type: "sine" },
          { mult: 2.0, gain: 0.25, type: "sine" },
          { mult: 3.0, gain: 0.12, type: "sine" },
        ],
        harpsichord: [
          { mult: 1.0, gain: 0.8, type: "sawtooth" },
          { mult: 2.0, gain: 0.6, type: "sawtooth" },
          { mult: 3.0, gain: 0.4, type: "triangle" },
          { mult: 4.0, gain: 0.2, type: "sine" },
        ],
      };

      const harmonics = harmonicProfiles[this.preset] || harmonicProfiles.grand;
      const createdOscs: OscillatorNode[] = [];

      for (const h of harmonics) {
        // Inharmonicity factor: strings naturally stretch higher harmonics slightly
        const inharmonicity = 1.0 + (h.mult - 1) * 0.0005;
        const targetFreq = freq * h.mult * inharmonicity;

        // For Grand preset fundamental, use 2 unison detuned strings (trichord chorus) for rich singing acoustic sound!
        const detuneVariants =
          this.preset === "grand" && h.mult === 1.0
            ? [-1.0, 1.0]
            : [0.0];

        for (const detuneCents of detuneVariants) {
          const osc = this.ctx.createOscillator();
          const hGain = this.ctx.createGain();

          osc.type = h.type;
          osc.frequency.setValueAtTime(targetFreq, now);
          if (detuneCents !== 0) {
            osc.detune.setValueAtTime(detuneCents, now);
          }

          const partialGain = detuneVariants.length > 1 ? h.gain * 0.62 : h.gain;
          hGain.gain.setValueAtTime(partialGain, now);

          // Higher harmonics die out faster than the fundamental
          const hDecay = Math.max(0.25, effectiveDecay / Math.sqrt(h.mult));
          hGain.gain.exponentialRampToValueAtTime(0.0008, now + hDecay);

          osc.connect(hGain);
          hGain.connect(voiceGain);

          osc.start(now);
          osc.stop(now + effectiveDecay);
          createdOscs.push(osc);
        }
      }

      // ======================================================================
      // 2. Felt Hammer Attack Transient (Soft Wooden Knock at Key Contact)
      // ======================================================================
      if (this.preset === "grand" || this.preset === "bright") {
        const hammerOsc = this.ctx.createOscillator();
        const hammerGain = this.ctx.createGain();

        hammerOsc.type = "sine";
        // Gentle low frequency body tap: 170Hz dropping to 45Hz in 14ms
        hammerOsc.frequency.setValueAtTime(170, now);
        hammerOsc.frequency.exponentialRampToValueAtTime(45, now + 0.015);

        hammerGain.gain.setValueAtTime(0.10, now);
        hammerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

        hammerOsc.connect(hammerGain);
        hammerGain.connect(voiceGain);

        hammerOsc.start(now);
        hammerOsc.stop(now + 0.018);
        createdOscs.push(hammerOsc);
      }

      // Memory cleanup
      const nodeItem = {
        stop: () => {
          for (const o of createdOscs) {
            try {
              o.stop();
            } catch {
              // ignore
            }
          }
        },
      };
      this.activeAudioNodes.push(nodeItem);

      setTimeout(() => {
        this.activeAudioNodes = this.activeAudioNodes.filter((n) => n !== nodeItem);
      }, effectiveDecay * 1000 + 100);
    } catch (err) {
      console.warn("Web Audio synthesis error:", err);
    }
  }

  public playChord(keys: string[], durationSec: number = 0.6, forceSound: boolean = false) {
    if (this.isMuted && !forceSound) return;
    for (const k of keys) {
      this.playNote(k, durationSec, forceSound);
    }
  }
}

export const pianoSynth = new PianoSynth();
