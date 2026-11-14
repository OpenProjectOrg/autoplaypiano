import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Box,
  Group,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Button,
  Paper,
} from "@mantine/core";
import {
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Radio,
  Keyboard,
  Sparkles,
} from "lucide-react";
import {
  pianoSynth,
  PianoSoundPreset,
  VIRTUAL_PIANO_KEY_DATA,
} from "../lib/piano-synth";
import { PianoSettings } from "../lib/piano-settings";

interface VirtualPianoKeyboardProps {
  activeNoteDisplay?: string; // Currently playing note/chord from AutoPlay
  isAudioMuted?: boolean;
  onToggleAudioMute?: () => void;
  speedMultiplier?: number;
  pianoSettings: PianoSettings;
  onUpdatePianoSettings: (partial: Partial<PianoSettings>) => void;
}

// 36 White keys in order
const WHITE_KEYS_SEQUENCE = [
  // Octave 3
  { char: "1", note: "C3", baseIndex: 0, hasBlackRight: true, blackChar: "!", blackNote: "C#3" },
  { char: "2", note: "D3", baseIndex: 1, hasBlackRight: true, blackChar: "@", blackNote: "D#3" },
  { char: "3", note: "E3", baseIndex: 2, hasBlackRight: false },
  { char: "4", note: "F3", baseIndex: 3, hasBlackRight: true, blackChar: "$", blackNote: "F#3" },
  { char: "5", note: "G3", baseIndex: 4, hasBlackRight: true, blackChar: "%", blackNote: "G#3" },
  { char: "6", note: "A3", baseIndex: 5, hasBlackRight: true, blackChar: "^", blackNote: "A#3" },
  { char: "7", note: "B3", baseIndex: 6, hasBlackRight: false },

  // Octave 4
  { char: "8", note: "C4", baseIndex: 7, hasBlackRight: true, blackChar: "*", blackNote: "C#4" },
  { char: "9", note: "D4", baseIndex: 8, hasBlackRight: true, blackChar: "(", blackNote: "D#4" },
  { char: "0", note: "E4", baseIndex: 9, hasBlackRight: false },
  { char: "q", note: "F4", baseIndex: 10, hasBlackRight: true, blackChar: "Q", blackNote: "F#4" },
  { char: "w", note: "G4", baseIndex: 11, hasBlackRight: true, blackChar: "W", blackNote: "G#4" },
  { char: "e", note: "A4", baseIndex: 12, hasBlackRight: true, blackChar: "E", blackNote: "A#4" },
  { char: "r", note: "B4", baseIndex: 13, hasBlackRight: false },

  // Octave 5
  { char: "t", note: "C5", baseIndex: 14, hasBlackRight: true, blackChar: "T", blackNote: "C#5" },
  { char: "y", note: "D5", baseIndex: 15, hasBlackRight: true, blackChar: "Y", blackNote: "D#5" },
  { char: "u", note: "E5", baseIndex: 16, hasBlackRight: false },
  { char: "i", note: "F5", baseIndex: 17, hasBlackRight: true, blackChar: "I", blackNote: "F#5" },
  { char: "o", note: "G5", baseIndex: 18, hasBlackRight: true, blackChar: "O", blackNote: "G#5" },
  { char: "p", note: "A5", baseIndex: 19, hasBlackRight: true, blackChar: "P", blackNote: "A#5" },
  { char: "a", note: "B5", baseIndex: 20, hasBlackRight: false },

  // Octave 6
  { char: "s", note: "C6", baseIndex: 21, hasBlackRight: true, blackChar: "S", blackNote: "C#6" },
  { char: "d", note: "D6", baseIndex: 22, hasBlackRight: true, blackChar: "D", blackNote: "D#6" },
  { char: "f", note: "E6", baseIndex: 23, hasBlackRight: false },
  { char: "g", note: "F6", baseIndex: 24, hasBlackRight: true, blackChar: "G", blackNote: "F#6" },
  { char: "h", note: "G6", baseIndex: 25, hasBlackRight: true, blackChar: "H", blackNote: "G#6" },
  { char: "j", note: "A6", baseIndex: 26, hasBlackRight: true, blackChar: "J", blackNote: "A#6" },
  { char: "k", note: "B6", baseIndex: 27, hasBlackRight: false },

  // Octave 7 & C8
  { char: "l", note: "C7", baseIndex: 28, hasBlackRight: true, blackChar: "L", blackNote: "C#7" },
  { char: "z", note: "D7", baseIndex: 29, hasBlackRight: true, blackChar: "Z", blackNote: "D#7" },
  { char: "x", note: "E7", baseIndex: 30, hasBlackRight: false },
  { char: "c", note: "F7", baseIndex: 31, hasBlackRight: true, blackChar: "C", blackNote: "F#7" },
  { char: "v", note: "G7", baseIndex: 32, hasBlackRight: true, blackChar: "V", blackNote: "G#7" },
  { char: "b", note: "A7", baseIndex: 33, hasBlackRight: true, blackChar: "B", blackNote: "A#7" },
  { char: "n", note: "B7", baseIndex: 34, hasBlackRight: false },
  { char: "m", note: "C8", baseIndex: 35, hasBlackRight: false },
];

interface WhiteKeyProps {
  char: string;
  note: string;
  isActive: boolean;
  showKeyLabels: boolean;
  showNoteNames: boolean;
  onTrigger: (char: string) => void;
}

const WhiteKey = React.memo<WhiteKeyProps>(
  ({ char, note, isActive, showKeyLabels, showNoteNames, onTrigger }) => {
    return (
      <Box
        onClick={() => onTrigger(char)}
        style={{
          flex: 1,
          height: "100%",
          backgroundColor: isActive ? "#ffd2c7" : "#fbf9f4",
          backgroundImage: isActive
            ? "linear-gradient(180deg, #ffb8a6 0%, #ff7d5c 100%)"
            : "linear-gradient(180deg, #ffffff 0%, #f6f3eb 85%, #e8e3d6 100%)",
          borderLeft: "1px solid rgba(0,0,0,0.15)",
          borderRight: "1px solid rgba(0,0,0,0.25)",
          borderBottom: isActive ? "3px solid #cc785c" : "5px solid #b8b1a0",
          borderRadius: "0 0 4px 4px",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 6,
          boxShadow: isActive
            ? "inset 0 2px 6px rgba(204,120,92,0.8), 0 0 14px rgba(204,120,92,0.6)"
            : "inset 0 -1px 3px rgba(0,0,0,0.15)",
          transform: isActive ? "translateY(2px)" : "translateY(0)",
          transition: "transform 0.04s ease",
          zIndex: 1,
        }}
      >
        {showKeyLabels && (
          <Text
            size="10px"
            fw={700}
            c={isActive ? "#ffffff" : "#2d2a26"}
            style={{
              fontFamily: "var(--font-mono)",
              lineHeight: 1,
              backgroundColor: isActive ? "#cc785c" : "transparent",
              padding: "1px 3px",
              borderRadius: "3px",
            }}
          >
            {char}
          </Text>
        )}
        {showNoteNames && (
          <Text
            size="8px"
            fw={600}
            c="dimmed"
            style={{ lineHeight: 1, marginTop: 2 }}
          >
            {note}
          </Text>
        )}
      </Box>
    );
  }
);

interface BlackKeyProps {
  char: string;
  note?: string;
  leftPercent: number;
  isActive: boolean;
  showKeyLabels: boolean;
  onTrigger: (char: string) => void;
}

const BlackKey = React.memo<BlackKeyProps>(
  ({ char, leftPercent, isActive, showKeyLabels, onTrigger }) => {
    return (
      <Box
        onClick={(e) => {
          e.stopPropagation();
          onTrigger(char);
        }}
        style={{
          position: "absolute",
          left: `${leftPercent}%`,
          top: 0,
          width: "1.9%",
          height: "60%",
          backgroundColor: isActive ? "#cc785c" : "#1a1917",
          backgroundImage: isActive
            ? "linear-gradient(180deg, #e58769 0%, #aa5035 100%)"
            : "linear-gradient(180deg, #2c2925 0%, #161513 80%, #0a0a09 100%)",
          borderRadius: "0 0 3px 3px",
          borderLeft: "1px solid rgba(255,255,255,0.15)",
          borderRight: "1px solid rgba(0,0,0,0.6)",
          borderBottom: isActive ? "2px solid #8e3922" : "3px solid #000000",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 4,
          boxShadow: isActive
            ? "0 0 12px rgba(204,120,92,0.85), inset 0 1px 2px rgba(255,255,255,0.3)"
            : "0 3px 6px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.2)",
          transform: isActive ? "translateY(2px)" : "translateY(0)",
          transition: "transform 0.04s ease",
          zIndex: 2,
        }}
      >
        {showKeyLabels && (
          <Text
            size="8px"
            fw={700}
            c={isActive ? "#ffffff" : "#c5c0b5"}
            style={{
              fontFamily: "var(--font-mono)",
              lineHeight: 1,
            }}
          >
            {char}
          </Text>
        )}
      </Box>
    );
  }
);

export const VirtualPianoKeyboard: React.FC<VirtualPianoKeyboardProps> = ({
  activeNoteDisplay,
  isAudioMuted,
  onToggleAudioMute,
  pianoSettings,
  onUpdatePianoSettings,
}) => {
  const { transpose, sustain, preset, showKeyLabels, showNoteNames } = pianoSettings;

  const presetNames: Record<PianoSoundPreset, string> = {
    grand: "STEINWAY CONCERT GRAND",
    bright: "YAMAHA STUDIO UPRIGHT",
    electric: "VINTAGE RHODES PIANO",
    harpsichord: "BAROQUE HARPSICHORD",
  };

  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [lcdDisplay, setLcdDisplay] = useState<string>(() =>
    transpose !== 0 ? `TR: ${transpose > 0 ? "+" : ""}${transpose}` : "READY"
  );
  const [lcdSub, setLcdSub] = useState<string>(() => presetNames[preset] || "STEINWAY CONCERT GRAND");

  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync transpose, sustain, preset with audio engine
  useEffect(() => {
    pianoSynth.transpose = transpose;
  }, [transpose]);

  useEffect(() => {
    pianoSynth.sustain = sustain;
  }, [sustain]);

  useEffect(() => {
    pianoSynth.preset = preset;
  }, [preset]);

  // Handle note triggering (plays acoustic sound and updates state)
  const triggerKey = useCallback((char: string) => {
    pianoSynth.playNote(char, 0.6, true); // forceSound=true allows direct free playing
    const info = pianoSynth.getNoteInfo(char);
    setLcdDisplay(info.scientificNote);
    setLcdSub(`${Math.round(info.transposedFreq)} Hz • KEY [${char}]`);

    setActiveKeys((prev) => new Set([...prev, char]));
    setTimeout(() => {
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(char);
        return next;
      });
    }, 240);
  }, []);

  // Physical Computer Keyboard Playing Support (Direct live playing anytime!)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing into an input field or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.repeat) return;

      const key = e.key;
      if (VIRTUAL_PIANO_KEY_DATA[key]) {
        e.preventDefault();
        triggerKey(key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [triggerKey]);

  // Highlight keys when notes are triggered via AutoPlay
  useEffect(() => {
    if (!activeNoteDisplay) return;

    const clean = activeNoteDisplay.replace(/[\[\]\s]/g, "");
    if (!clean) return;

    const keyChars = clean.split("");
    const newActiveSet = new Set(keyChars);
    setActiveKeys(newActiveSet);

    const firstChar = keyChars[0];
    const info = pianoSynth.getNoteInfo(firstChar);
    if (keyChars.length > 1) {
      setLcdDisplay(`CHORD (${keyChars.length})`);
      setLcdSub(`${info.scientificNote} + [${clean}]`);
    } else {
      setLcdDisplay(info.scientificNote);
      setLcdSub(`${Math.round(info.transposedFreq)} Hz • KEY [${firstChar}]`);
    }

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setActiveKeys(new Set());
    }, 280);

    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [activeNoteDisplay]);

  // Listen to live note events emitted by pianoSynth (only for manual interactions)
  useEffect(() => {
    const unsubscribe = pianoSynth.addNoteListener((info) => {
      // If AutoPlay is driving activeNoteDisplay, skip duplicate callback to prevent stutter
      if (activeNoteDisplay) return;

      setActiveKeys((prev) => new Set([...prev, info.char]));
      setLcdDisplay(info.scientificNote);
      setLcdSub(`${Math.round(info.transposedFreq)} Hz • KEY [${info.char}]`);

      setTimeout(() => {
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(info.char);
          return next;
        });
      }, 240);
    });

    return () => unsubscribe();
  }, [activeNoteDisplay]);

  const handleTransposeChange = (delta: number) => {
    const next = Math.max(-12, Math.min(12, transpose + delta));
    onUpdatePianoSettings({ transpose: next });
    setLcdDisplay(`TR: ${next >= 0 ? "+" : ""}${next}`);
    setLcdSub(next === 0 ? "STANDARD PITCH" : `${Math.abs(next)} SEMITONES SHIFT`);
  };

  const handleCyclePreset = () => {
    const list: PianoSoundPreset[] = ["grand", "bright", "electric", "harpsichord"];
    const idx = list.indexOf(preset);
    const next = list[(idx + 1) % list.length];
    onUpdatePianoSettings({ preset: next });

    setLcdDisplay(next.toUpperCase());
    setLcdSub(presetNames[next]);
  };

  // Black keys positions relative to white keys (36 white keys total = 100%)
  const blackKeysData = useMemo(() => {
    const totalWhite = WHITE_KEYS_SEQUENCE.length;
    const whiteWidthPercent = 100 / totalWhite;

    const list: Array<{
      char: string;
      note: string;
      leftPercent: number;
    }> = [];

    WHITE_KEYS_SEQUENCE.forEach((item, index) => {
      if (item.hasBlackRight && item.blackChar && item.blackNote) {
        const noteLetter = item.note.charAt(0);
        let offset = 0.68;
        if (noteLetter === "D") offset = 0.72;
        if (noteLetter === "G") offset = 0.7;
        if (noteLetter === "A") offset = 0.73;

        const left = (index + offset) * whiteWidthPercent;
        list.push({
          char: item.blackChar,
          note: item.blackNote,
          leftPercent: left,
        });
      }
    });

    return list;
  }, []);

  return (
    <Box
      style={{
        borderRadius: "14px",
        overflow: "hidden",
        backgroundColor: "#161513",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 10px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
        userSelect: "none",
        position: "relative",
      }}
    >
      {/* Wood Cheek Left Accent */}
      <Box
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 9,
          background: "linear-gradient(90deg, #4a2818, #63361f 65%, #2a150c)",
          zIndex: 4,
          borderRight: "1px solid #1a0e07",
        }}
      />
      {/* Wood Cheek Right Accent */}
      <Box
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: 9,
          background: "linear-gradient(270deg, #4a2818, #63361f 65%, #2a150c)",
          zIndex: 4,
          borderLeft: "1px solid #1a0e07",
        }}
      />

      {/* Top Hardware Control Panel (A-23 Virtual Piano Aesthetic) */}
      <Box
        px="md"
        py="xs"
        style={{
          marginLeft: 9,
          marginRight: 9,
          backgroundColor: "#1a1916",
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.35) 100%)",
          borderBottom: "2px solid #0d0c0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Left Side: Brand & High-Contrast Mapping Toggle Buttons */}
        <Group gap="sm" align="center">
          <Box>
            <Text
              size="xs"
              fw={800}
              c="#faf9f5"
              style={{ letterSpacing: "0.14em", fontFamily: "var(--font-mono)", lineHeight: 1.1 }}
            >
              A-23 <span style={{ color: "#cc785c", fontWeight: 800 }}>STUDIO</span>
            </Text>
            <Text
              size="10px"
              fw={700}
              c="#d4cfc5"
              style={{ letterSpacing: "0.15em", textTransform: "uppercase", lineHeight: 1.2 }}
            >
              VIRTUAL PIANO
            </Text>
          </Box>

          {/* High-Contrast KEYS and NOTES Toggle Buttons */}
          <Group gap={6} ml="xs">
            <Tooltip label="Tampilkan huruf keyboard PC (1-9, q-p, a-l, z-m)" withArrow>
              <Button
                size="compact-xs"
                variant={showKeyLabels ? "filled" : "default"}
                color={showKeyLabels ? "coral" : "gray"}
                onClick={() => onUpdatePianoSettings({ showKeyLabels: !showKeyLabels })}
                style={{
                  height: 26,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  backgroundColor: showKeyLabels ? "#cc785c" : "#24221e",
                  color: "#faf9f5",
                  borderColor: showKeyLabels ? "#cc785c" : "rgba(255, 255, 255, 0.2)",
                }}
              >
                KEYS
              </Button>
            </Tooltip>

            <Tooltip label="Tampilkan notasi ilmiah piano (C3, D3, C4...)" withArrow>
              <Button
                size="compact-xs"
                variant={showNoteNames ? "filled" : "default"}
                color={showNoteNames ? "teal" : "gray"}
                onClick={() => onUpdatePianoSettings({ showNoteNames: !showNoteNames })}
                style={{
                  height: 26,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  backgroundColor: showNoteNames ? "#5db8a6" : "#24221e",
                  color: "#faf9f5",
                  borderColor: showNoteNames ? "#5db8a6" : "rgba(255, 255, 255, 0.2)",
                }}
              >
                NOTES
              </Button>
            </Tooltip>
          </Group>
        </Group>

        {/* Center: Recessed Retro Digital LCD Screen & Neat Transpose Module */}
        <Group gap="md" align="center" wrap="wrap">
          {/* Tidy & Spacious Transpose Module */}
          <Paper
            p={4}
            px={8}
            radius="md"
            style={{
              backgroundColor: "#11100e",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text
              size="10px"
              fw={700}
              c="#e8e3d6"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              TRANSPOSE
            </Text>

            {/* Turun (Down) Button */}
            <Tooltip label="Turunkan 1 Semitone (-1)" withArrow>
              <ActionIcon
                size="md"
                variant="filled"
                radius="sm"
                onClick={() => handleTransposeChange(-1)}
                disabled={transpose <= -12}
                aria-label="Transpose turun"
                styles={{
                  root: {
                    backgroundColor: "#262420",
                    border: "1px solid rgba(255,255,255,0.22)",
                    color: "#faf9f5",
                    "&:hover": { backgroundColor: "#332f28" },
                  },
                }}
              >
                <ChevronDown size={16} />
              </ActionIcon>
            </Tooltip>

            {/* Value Display */}
            <Box
              style={{
                minWidth: 38,
                textAlign: "center",
                backgroundColor: "#181714",
                borderRadius: "4px",
                padding: "2px 6px",
                border: "1px solid rgba(204, 120, 92, 0.5)",
              }}
            >
              <Text
                size="xs"
                fw={800}
                c={transpose !== 0 ? "#ff9d80" : "#faf9f5"}
                style={{ fontFamily: "var(--font-mono)", lineHeight: 1.2 }}
              >
                {transpose >= 0 ? `+${transpose}` : transpose}
              </Text>
            </Box>

            {/* Naik (Up) Button */}
            <Tooltip label="Naikkan 1 Semitone (+1)" withArrow>
              <ActionIcon
                size="md"
                variant="filled"
                radius="sm"
                onClick={() => handleTransposeChange(+1)}
                disabled={transpose >= 12}
                aria-label="Transpose naik"
                styles={{
                  root: {
                    backgroundColor: "#262420",
                    border: "1px solid rgba(255,255,255,0.22)",
                    color: "#faf9f5",
                    "&:hover": { backgroundColor: "#332f28" },
                  },
                }}
              >
                <ChevronUp size={16} />
              </ActionIcon>
            </Tooltip>

            {/* Reset Button: ALWAYS visible to avoid layout jump and miss-clicks */}
            <Tooltip
              label={transpose !== 0 ? "Reset Transpose ke 0" : "Transpose Netral (0)"}
              withArrow
            >
              <ActionIcon
                size="md"
                variant="filled"
                radius="sm"
                onClick={() => handleTransposeChange(-transpose)}
                disabled={transpose === 0}
                aria-label="Reset Transpose"
                styles={{
                  root: {
                    backgroundColor: transpose !== 0 ? "#33221b" : "#1a1916",
                    border: transpose !== 0 ? "1px solid rgba(255, 157, 128, 0.45)" : "1px solid rgba(255,255,255,0.12)",
                    color: transpose !== 0 ? "#ff9d80" : "rgba(255,255,255,0.22)",
                    cursor: transpose === 0 ? "default" : "pointer",
                    "&:hover": {
                      backgroundColor: transpose !== 0 ? "#452b22" : "#1a1916",
                    },
                  },
                }}
              >
                <RotateCcw size={14} />
              </ActionIcon>
            </Tooltip>
          </Paper>

          {/* Digital LCD Window (Glowing Phosphor Display) */}
          <Box
            style={{
              minWidth: 160,
              padding: "6px 16px",
              backgroundColor: "#0b120f",
              borderRadius: "6px",
              border: "2px solid #2f3833",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.15)",
              textAlign: "center",
              position: "relative",
            }}
          >
            <Text
              fw={800}
              size="lg"
              style={{
                color: "#5dfcd2",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.12em",
                textShadow: "0 0 12px rgba(93, 252, 210, 0.7)",
                lineHeight: 1.15,
              }}
            >
              {lcdDisplay}
            </Text>
            <Text
              size="9px"
              fw={700}
              style={{
                color: "#469c84",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {lcdSub}
            </Text>
          </Box>

          {/* Sustain Pedal Toggle */}
          <Button
            size="compact-sm"
            variant="default"
            onClick={() => onUpdatePianoSettings({ sustain: !sustain })}
            leftSection={
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: sustain ? "#5dfcd2" : "#555",
                  boxShadow: sustain ? "0 0 8px #5dfcd2" : "none",
                }}
              />
            }
            style={{
              height: 32,
              fontSize: "11px",
              fontWeight: 700,
              backgroundColor: "#161512",
              borderColor: sustain ? "rgba(93, 252, 210, 0.5)" : "rgba(255,255,255,0.15)",
              color: sustain ? "#faf9f5" : "#a8a49c",
            }}
          >
            SUSTAIN
          </Button>

          {/* Sound Timbre Selector */}
          <Button
            size="compact-sm"
            variant="default"
            onClick={handleCyclePreset}
            leftSection={<Radio size={13} color="#cc785c" />}
            style={{
              height: 32,
              fontSize: "11px",
              fontWeight: 700,
              backgroundColor: "#161512",
              borderColor: "rgba(255,255,255,0.15)",
              color: "#faf9f5",
            }}
          >
            SOUND: {preset.toUpperCase()}
          </Button>
        </Group>

        {/* Right Side: Audio Mode & Keyboard Hint */}
        <Group gap="xs" align="center">
          {onToggleAudioMute && (
            <Tooltip
              label={
                isAudioMuted
                  ? "Audio AutoPlay Ter-Mute (Roblox Safe). Tuts piano tetap bisa dimainkan langsung!"
                  : "Audio Aplikasi Menyala (Live Acoustic Sound aktif)."
              }
              withArrow
            >
              <Button
                size="compact-sm"
                variant={isAudioMuted ? "light" : "filled"}
                color={isAudioMuted ? "gray" : "teal"}
                onClick={onToggleAudioMute}
                leftSection={isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                style={{ height: 30, fontSize: "11px", fontWeight: 700 }}
              >
                {isAudioMuted ? "Audio: Muted" : "Audio: LIVE ON"}
              </Button>
            </Tooltip>
          )}

          <Badge size="sm" variant="outline" color="coral" style={{ fontWeight: 700 }}>
            61 KEYS (C3-C8)
          </Badge>
        </Group>
      </Box>

      {/* Helper Bar: Interactive Live Keyboard Indicator */}
      <Box
        px="md"
        py={3}
        style={{
          marginLeft: 9,
          marginRight: 9,
          backgroundColor: "#12110f",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Group gap={6}>
          <Keyboard size={13} color="#cc785c" />
          <Text size="11px" fw={600} c="#d4cfc5">
            Bisa dimainkan langsung: Tekan keyboard PC Anda (<strong>1-9</strong>, <strong>q-p</strong>, <strong>a-l</strong>, <strong>z-m</strong>) atau klik tuts dengan mouse!
          </Text>
        </Group>
        <Group gap={4}>
          <Sparkles size={12} color="#e8a55a" />
          <Text size="10px" fw={600} c="dimmed">
            Trichord Acoustic Grand Sound Active
          </Text>
        </Group>
      </Box>

      {/* 61-Key Interactive Piano Keyboard */}
      <Box
        px={9}
        pb="sm"
        pt={4}
        style={{
          position: "relative",
          backgroundColor: "#0d0c0b",
        }}
      >
        <Box
          style={{
            position: "relative",
            width: "100%",
            height: 145,
            display: "flex",
            backgroundColor: "#000",
            borderRadius: "0 0 6px 6px",
            boxShadow: "inset 0 4px 10px rgba(0,0,0,0.85)",
            overflow: "hidden",
          }}
        >
          {/* White Keys */}
          {WHITE_KEYS_SEQUENCE.map((item) => (
            <WhiteKey
              key={item.char}
              char={item.char}
              note={item.note}
              isActive={activeKeys.has(item.char)}
              showKeyLabels={showKeyLabels}
              showNoteNames={showNoteNames}
              onTrigger={triggerKey}
            />
          ))}

          {/* Black Keys */}
          {blackKeysData.map((item) => (
            <BlackKey
              key={item.char}
              char={item.char}
              note={item.note}
              leftPercent={item.leftPercent}
              isActive={activeKeys.has(item.char)}
              showKeyLabels={showKeyLabels}
              onTrigger={triggerKey}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};
