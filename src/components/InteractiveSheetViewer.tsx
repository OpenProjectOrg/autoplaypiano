import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  Globe,
  MapPin,
  RotateCcw,
  Minus,
  Plus,
  Pencil,
  Music2,
  Download,
} from "lucide-react";
import { PianoSheet, PlaybackState } from "../lib/types";
import { pianoSynth } from "../lib/piano-synth";
import { PianoSettings } from "../lib/piano-settings";
import { VirtualPianoKeyboard } from "./VirtualPianoKeyboard";
import { useTranslation } from "../i18n";
import { exportSheetAsTxt } from "../lib/sheet-export-import";
import {
  Box,
  Group,
  Text,
  Title,
  Badge,
  Button,
  Select,
  ActionIcon,
  Paper,
  Kbd,
} from "@mantine/core";

interface InteractiveSheetViewerProps {
  sheet: PianoSheet;
  playbackState: PlaybackState;
  speedMultiplier: number;
  setSpeedMultiplier: (spd: number) => void;
  startIndex: number;
  setStartIndex: (idx: number) => void;
  onStartPlayback: (sheet: PianoSheet, fromIndex?: number) => void;
  onPausePlayback: () => void;
  onResumePlayback: () => void;
  onSeekNote?: (targetIndex: number, noteDisplay?: string) => void;
  onStopPlayback: () => void;
  onBackToLibrary: () => void;
  onOpenSyncModal: () => void;
  onEditSheet?: (sheet: PianoSheet) => void;
  isAudioMuted?: boolean;
  onToggleAudioMute?: () => void;
  pianoSettings: PianoSettings;
  onUpdatePianoSettings: (partial: Partial<PianoSettings>) => void;
}

interface SheetToken {
  text: string;
  isPlayable: boolean;
  eventIndex?: number;
  lineNumber: number;
}

interface SheetLineData {
  isComment: boolean;
  lineNum: number;
  text: string;
  tokens: SheetToken[];
  firstEventIndex?: number;
  lastEventIndex?: number;
}

interface NotationLineProps {
  lineData: SheetLineData;
  activeEventIndex: number;
  startIndex: number;
  isPlaying: boolean;
  isInteractive: boolean;
  onLineSelect: (lineNum: string) => void;
  onNoteClick: (token: SheetToken) => void;
  activeTokenRef: React.RefObject<HTMLSpanElement | null>;
}

const NotationLine = React.memo<NotationLineProps>(
  ({
    lineData,
    activeEventIndex,
    startIndex,
    isPlaying,
    isInteractive,
    onLineSelect,
    onNoteClick,
    activeTokenRef,
  }) => {
    if (lineData.isComment) {
      return (
        <div className="notation-row comment-row">
          <span className="line-gutter-num">#</span>
          <div className="notation-line-content">{lineData.text}</div>
        </div>
      );
    }

    return (
      <div className="notation-row">
        <span
          className={`line-gutter-num ${isInteractive ? "cursor-pointer hover:text-coral-500" : "opacity-60"}`}
          onClick={() => isInteractive && onLineSelect(lineData.lineNum.toString())}
          title={`Klik untuk mulai dari Baris ${lineData.lineNum}`}
        >
          {lineData.lineNum}
        </span>

        <div className="notation-line-content">
          {lineData.tokens.map((token, tokIdx) => {
            if (!token.isPlayable || token.eventIndex === undefined) {
              return (
                <span key={tokIdx} className="notation-token whitespace-token">
                  {token.text}
                </span>
              );
            }

            const isCurrentActive = token.eventIndex === activeEventIndex;
            const isPassed = token.eventIndex < activeEventIndex;
            const isStartPoint = !isPlaying && token.eventIndex === startIndex;

            return (
              <span
                key={tokIdx}
                ref={isCurrentActive ? activeTokenRef : null}
                onClick={() => onNoteClick(token)}
                className={`notation-token playable-token ${
                  isCurrentActive
                    ? "token-active"
                    : isPassed
                    ? "token-passed"
                    : isStartPoint
                    ? "token-start-pin"
                    : "token-upcoming"
                } ${isInteractive ? "cursor-pointer" : ""}`}
                title={
                  !isPlaying
                    ? `Klik untuk mulai autoplay dari not [${token.text}]`
                    : undefined
                }
              >
                {token.text}
              </span>
            );
          })}
        </div>
      </div>
    );
  },
  (prev, next) => {
    if (prev.lineData.isComment && next.lineData.isComment) return true;

    if (
      prev.isPlaying !== next.isPlaying ||
      prev.isInteractive !== next.isInteractive ||
      prev.startIndex !== next.startIndex ||
      prev.lineData !== next.lineData
    ) {
      return false;
    }

    const first = prev.lineData.firstEventIndex;
    const last = prev.lineData.lastEventIndex;
    if (first === undefined || last === undefined) return true;

    const pActive = prev.activeEventIndex;
    const nActive = next.activeEventIndex;

    const pIn = pActive >= first && pActive <= last;
    const nIn = nActive >= first && nActive <= last;

    if (pIn || nIn) {
      return false;
    }

    const pPast = pActive > last;
    const nPast = nActive > last;
    if (pPast === nPast) {
      return true;
    }

    return false;
  }
);

export const InteractiveSheetViewer: React.FC<InteractiveSheetViewerProps> = ({
  sheet,
  playbackState,
  speedMultiplier,
  setSpeedMultiplier,
  startIndex,
  setStartIndex,
  onStartPlayback,
  onPausePlayback,
  onResumePlayback,
  onSeekNote,
  onStopPlayback,
  onBackToLibrary,
  onOpenSyncModal,
  onEditSheet,
  isAudioMuted,
  onToggleAudioMute,
  pianoSettings,
  onUpdatePianoSettings,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [localSoundMuted, setLocalSoundMuted] = useState(true);
  const activeTokenRef = useRef<HTMLSpanElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const effectiveMuted = isAudioMuted !== undefined ? isAudioMuted : localSoundMuted;
  const toggleSound = onToggleAudioMute || (() => setLocalSoundMuted(!localSoundMuted));

  // Sync mute state with piano synth
  useEffect(() => {
    pianoSynth.isMuted = effectiveMuted;
  }, [effectiveMuted]);

  // When paused or stopped, kill any active audio immediately
  useEffect(() => {
    if (playbackState.isPaused || !playbackState.isPlaying) {
      pianoSynth.stopAll();
    } else {
      pianoSynth.resumeAudio();
    }
  }, [playbackState.isPaused, playbackState.isPlaying]);

  // Internal Web Audio playback if unmuted and actively playing
  useEffect(() => {
    if (!effectiveMuted && playbackState.isPlaying && !playbackState.isPaused && playbackState.currentNoteDisplay) {
      const display = playbackState.currentNoteDisplay;
      if (display.startsWith("[") && display.endsWith("]")) {
        const keys = display.slice(1, -1).split("");
        pianoSynth.playChord(keys, 0.45);
      } else {
        pianoSynth.playNote(display, 0.45);
      }
    }
  }, [effectiveMuted, playbackState.currentIndex, playbackState.isPlaying, playbackState.isPaused, playbackState.currentNoteDisplay]);

  // Parse lines and tokens with mapped event indices and line numbers
  const { linesWithTokens, totalPlayableEvents, lineToFirstEventMap } = useMemo(() => {
    let globalEventIndex = 0;
    const lines = sheet.content.split("\n");
    const lineMap: Record<number, number> = {};

    const parsedLines: SheetLineData[] = lines.map((line, lineIdx) => {
      const lineNum = lineIdx + 1;
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) {
        return { isComment: true, lineNum, text: line, tokens: [] };
      }

      const tokens: SheetToken[] = [];
      const regex = /(\[[^\]]+\]|\{[^\}]+\}|-|\S|\s+)/g;
      let match;
      let lineFirstEvent: number | undefined = undefined;
      let lineLastEvent: number | undefined = undefined;

      while ((match = regex.exec(trimmed)) !== null) {
        const item = match[0];
        if (item.trim() === "") {
          tokens.push({ text: item, isPlayable: false, lineNumber: lineNum });
        } else if (item.startsWith("[") || item.startsWith("{")) {
          if (lineMap[lineNum] === undefined) {
            lineMap[lineNum] = globalEventIndex;
          }
          if (lineFirstEvent === undefined) lineFirstEvent = globalEventIndex;
          lineLastEvent = globalEventIndex;
          tokens.push({
            text: item,
            isPlayable: true,
            eventIndex: globalEventIndex++,
            lineNumber: lineNum,
          });
        } else if (item === "-" || item === "~" || item === "|") {
          tokens.push({ text: item, isPlayable: false, lineNumber: lineNum });
        } else {
          if (lineMap[lineNum] === undefined) {
            lineMap[lineNum] = globalEventIndex;
          }
          if (lineFirstEvent === undefined) lineFirstEvent = globalEventIndex;
          lineLastEvent = globalEventIndex;
          tokens.push({
            text: item,
            isPlayable: true,
            eventIndex: globalEventIndex++,
            lineNumber: lineNum,
          });
        }
      }

      return {
        isComment: false,
        lineNum,
        text: line,
        tokens,
        firstEventIndex: lineFirstEvent,
        lastEventIndex: lineLastEvent,
      };
    });

    return {
      linesWithTokens: parsedLines,
      totalPlayableEvents: globalEventIndex,
      lineToFirstEventMap: lineMap,
    };
  }, [sheet.content]);

  const isInteractive = !playbackState.isPlaying || playbackState.isPaused;
  const currentActiveIndex = playbackState.isPlaying
    ? playbackState.currentIndex
    : playbackState.isPaused
    ? playbackState.currentIndex
    : startIndex;

  // Find active line number
  const selectedLineNumber = useMemo(() => {
    let bestLine = 1;
    for (const [lNum, evIdx] of Object.entries(lineToFirstEventMap)) {
      if (currentActiveIndex >= evIdx) {
        bestLine = Number(lNum);
      }
    }
    return bestLine;
  }, [lineToFirstEventMap, currentActiveIndex]);

  // Select options for Line selection
  const lineSelectData = useMemo(() => {
    return Object.keys(lineToFirstEventMap).map((lNum) => ({
      value: lNum,
      label: `Baris ${lNum} (Not #${lineToFirstEventMap[Number(lNum)] + 1})`,
    }));
  }, [lineToFirstEventMap]);

  // Speed options
  const speedSelectData = [
    { value: "0.5", label: "0.5x (Sangat Lambat)" },
    { value: "0.75", label: "0.75x (Lambat)" },
    { value: "1", label: "1.0x (Normal PPS)" },
    { value: "1.25", label: "1.25x (Cepat)" },
    { value: "1.5", label: "1.5x (Sangat Cepat)" },
    { value: "2", label: "2.0x (Maksimal)" },
  ];

  // Smart Line-Aware Auto-Scroll: Only triggers when active line changes or approaches boundaries!
  const lastScrolledLineRef = useRef<number>(-1);
  const scrollAnimFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playbackState.isPlaying) {
      lastScrolledLineRef.current = -1;
      return;
    }

    const tokenEl = activeTokenRef.current;
    const container = containerRef.current;
    if (!tokenEl || !container) return;

    // Check if line changed
    if (selectedLineNumber === lastScrolledLineRef.current) {
      // Still on same line! Do NOT thrash layout with scroll on every note!
      return;
    }

    lastScrolledLineRef.current = selectedLineNumber;

    if (scrollAnimFrameRef.current) {
      cancelAnimationFrame(scrollAnimFrameRef.current);
    }

    scrollAnimFrameRef.current = requestAnimationFrame(() => {
      const cRect = container.getBoundingClientRect();
      const tRect = tokenEl.getBoundingClientRect();

      // Check if token is nearing viewport top/bottom boundaries
      const isOutsideComfortZone =
        tRect.bottom > cRect.bottom - 75 || tRect.top < cRect.top + 50;

      if (isOutsideComfortZone) {
        tokenEl.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    });

    return () => {
      if (scrollAnimFrameRef.current) {
        cancelAnimationFrame(scrollAnimFrameRef.current);
      }
    };
  }, [selectedLineNumber, playbackState.isPlaying]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sheet.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const playSoundPreview = (text: string) => {
    pianoSynth.resumeAudio();
    if (text.startsWith("[") && text.endsWith("]")) {
      const keys = text.slice(1, -1).split("");
      pianoSynth.playChord(keys, 0.35, true);
    } else {
      pianoSynth.playNote(text, 0.35, true);
    }
  };

  const handleLineSelect = useCallback(
    (lineNumStr: string | null) => {
      if (!lineNumStr) return;
      const lineNum = Number(lineNumStr);
      const targetIdx = lineToFirstEventMap[lineNum];
      if (targetIdx !== undefined) {
        if (onSeekNote) {
          onSeekNote(targetIdx);
        } else {
          setStartIndex(targetIdx);
        }
        const firstToken = linesWithTokens.find((l) => l.lineNum === lineNum)?.tokens.find((t) => t.isPlayable);
        if (firstToken) {
          playSoundPreview(firstToken.text);
        }
      }
    },
    [lineToFirstEventMap, linesWithTokens, onSeekNote, setStartIndex]
  );

  const handleStepNote = (targetIdx: number) => {
    const clamped = Math.max(0, Math.min(totalPlayableEvents - 1, targetIdx));
    let noteTxt = "";
    for (const line of linesWithTokens) {
      for (const tok of line.tokens) {
        if (tok.isPlayable && tok.eventIndex === clamped) {
          noteTxt = tok.text;
          break;
        }
      }
      if (noteTxt) break;
    }
    if (noteTxt) {
      playSoundPreview(noteTxt);
    }
    if (onSeekNote) {
      onSeekNote(clamped, noteTxt);
    } else {
      setStartIndex(clamped);
    }
  };

  const handleNoteClick = useCallback(
    (token: SheetToken) => {
      if (!isInteractive || token.eventIndex === undefined) return;
      playSoundPreview(token.text);
      if (onSeekNote) {
        onSeekNote(token.eventIndex, token.text);
      } else {
        setStartIndex(token.eventIndex);
      }
    },
    [isInteractive, onSeekNote, setStartIndex]
  );

  const handleResetStart = () => {
    if (onSeekNote) {
      onSeekNote(0);
    } else {
      setStartIndex(0);
    }
  };

  return (
    <Box p="lg" style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Top Breadcrumb Navigation */}
      <Group justify="space-between" mb="sm" wrap="wrap">
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<ArrowLeft size={14} />}
          onClick={onBackToLibrary}
        >
          {t("player.backToLibrary")}
        </Button>
        <Text size="xs" c="dimmed">
          Koleksi &gt; {sheet.artist} &gt; <strong>{sheet.title}</strong>
        </Text>
      </Group>

      {/* Song Header Info Card */}
      <Paper
        p="md"
        radius="lg"
        withBorder
        mb="md"
        style={{
          backgroundColor: "var(--surface-card)",
          boxShadow: "var(--surface-card-shadow)",
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="md">
            <Box
              style={{
                width: 44,
                height: 44,
                borderRadius: "10px",
                backgroundColor: "var(--surface-dark)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
              }}
            >
              <Sparkles size={22} />
            </Box>
            <Box>
              <Group gap="xs">
                <Title order={3} fw={700}>
                  {sheet.title}
                </Title>
                <Badge
                  color={pianoSettings.transpose !== 0 ? "coral" : "teal"}
                  variant="light"
                  size="sm"
                >
                  {pianoSettings.transpose !== 0
                    ? `TRANSPOSE ${pianoSettings.transpose > 0 ? `+${pianoSettings.transpose}` : pianoSettings.transpose}`
                    : "TRANSPOSE 0"}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {sheet.artist} • <span style={{ color: "#e8a55a" }}>★ 4.9</span> • {sheet.bpm} BPM • {totalPlayableEvents} Notasi
              </Text>
            </Box>
          </Group>

          <Group gap="xs">
            <Button
              variant={pianoSettings.showVirtualPiano ? "light" : "default"}
              color={pianoSettings.showVirtualPiano ? "coral" : "gray"}
              size="xs"
              radius="md"
              leftSection={<Music2 size={14} color="#cc785c" />}
              onClick={() => onUpdatePianoSettings({ showVirtualPiano: !pianoSettings.showVirtualPiano })}
            >
              {pianoSettings.showVirtualPiano ? "Tutup Virtual Piano" : "Virtual Piano A-23"}
            </Button>
            {onEditSheet && (
              <Button
                variant="default"
                size="xs"
                radius="md"
                leftSection={<Pencil size={14} color="#cc785c" />}
                onClick={() => onEditSheet(sheet)}
              >
                Edit Sheet & BPM
              </Button>
            )}
            <Button
              variant="default"
              size="xs"
              radius="md"
              leftSection={<Globe size={14} color="#cc785c" />}
              onClick={onOpenSyncModal}
            >
              {t("player.syncButton")}
            </Button>
            <Button
              variant="default"
              size="xs"
              radius="md"
              leftSection={<Download size={14} color="#cc785c" />}
              onClick={() => exportSheetAsTxt(sheet)}
            >
              {t("exportImport.exportSingleTxt")}
            </Button>
            <Button
              color="coral"
              size="xs"
              radius="md"
              leftSection={copied ? <Check size={14} /> : <Copy size={14} />}
              onClick={handleCopy}
            >
              {copied ? t("profile.secretCopied") : "Copy Sheet"}
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* A-23 Virtual Piano Keyboard & Studio Console */}
      {pianoSettings.showVirtualPiano && (
        <Box mb="md">
          <VirtualPianoKeyboard
            activeNoteDisplay={playbackState.currentNoteDisplay}
            isAudioMuted={effectiveMuted}
            onToggleAudioMute={toggleSound}
            speedMultiplier={speedMultiplier}
            pianoSettings={pianoSettings}
            onUpdatePianoSettings={onUpdatePianoSettings}
          />
        </Box>
      )}

      {/* Main Interactive Monospace Sheet Viewer */}
      <Paper
        radius="lg"
        withBorder
        style={{
          backgroundColor: "var(--surface-dark)",
          borderColor: "rgba(204,120,92,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Top Control Toolbar */}
        <Box
          p="sm"
          style={{
            backgroundColor: "#141311",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <Group gap="xs" wrap="wrap">
            <Group gap={4}>
              <MapPin size={14} color="#cc785c" />
              <Text size="xs" fw={600} c="zinc.4">
                Mulai Dari:
              </Text>
            </Group>

            <Select
              size="xs"
              data={lineSelectData}
              value={selectedLineNumber.toString()}
              onChange={handleLineSelect}
              disabled={!isInteractive}
              style={{ width: 180 }}
              styles={{
                input: {
                  backgroundColor: "#22211e",
                  color: "#faf9f5",
                  borderColor: "rgba(255,255,255,0.15)",
                },
              }}
            />

            {/* Stepper Note */}
            <Group
              gap={4}
              p={4}
              style={{
                backgroundColor: "#22211e",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <Text size="11px" c="zinc.4" px={4}>
                Not ke-
              </Text>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                disabled={!isInteractive || currentActiveIndex <= 0}
                onClick={() => handleStepNote(currentActiveIndex - 1)}
              >
                <Minus size={11} />
              </ActionIcon>
              <Text size="xs" fw={700} c="white" style={{ fontFamily: "var(--font-mono)", minWidth: 24, textAlign: "center" }}>
                {currentActiveIndex + 1}
              </Text>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                disabled={!isInteractive || currentActiveIndex >= totalPlayableEvents - 1}
                onClick={() => handleStepNote(currentActiveIndex + 1)}
              >
                <Plus size={11} />
              </ActionIcon>
              <Text size="10px" c="zinc.5" pr={4}>
                / {totalPlayableEvents}
              </Text>
            </Group>

            {currentActiveIndex > 0 && !playbackState.isPlaying && (
              <Button
                variant="subtle"
                color="coral"
                size="xs"
                leftSection={<RotateCcw size={12} />}
                onClick={handleResetStart}
              >
                Reset Awal
              </Button>
            )}
          </Group>

          <Group gap={6}>
            <Kbd size="xs">F6</Kbd>
            <Text size="11px" c="zinc.4">
              Play/Pause
            </Text>
            <Text size="11px" c="zinc.6">
              •
            </Text>
            <Kbd size="xs">ESC</Kbd>
            <Text size="11px" c="zinc.4">
              Stop
            </Text>
            <Text size="11px" c="zinc.6">
              •
            </Text>
            <Text size="11px" c="coral.4">
              Klik tuts manapun untuk mulai dari sana
            </Text>
          </Group>
        </Box>

        {/* Scrollable Notation Canvas */}
        <div className="notation-viewport" ref={containerRef}>
          {linesWithTokens.map((lineData) => (
            <NotationLine
              key={lineData.lineNum}
              lineData={lineData}
              activeEventIndex={currentActiveIndex}
              startIndex={startIndex}
              isPlaying={playbackState.isPlaying}
              isInteractive={isInteractive}
              onLineSelect={handleLineSelect}
              onNoteClick={handleNoteClick}
              activeTokenRef={activeTokenRef}
            />
          ))}
        </div>

        {/* Bottom Interactive Controls */}
        <Box
          p="sm"
          style={{
            backgroundColor: "#141311",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <Group gap="sm" wrap="wrap">
            <Button
              variant={pianoSettings.sustain ? "filled" : "default"}
              color="coral"
              size="xs"
              onClick={() => onUpdatePianoSettings({ sustain: !pianoSettings.sustain })}
            >
              Sustain: {pianoSettings.sustain ? "On" : "Off"}
            </Button>

            <Group gap={4}>
              <Text size="xs" c="zinc.4">
                Speed:
              </Text>
              <Select
                size="xs"
                data={speedSelectData}
                value={speedMultiplier.toString()}
                onChange={(val) => val && setSpeedMultiplier(parseFloat(val))}
                style={{ width: 140 }}
                styles={{
                  input: {
                    backgroundColor: "#22211e",
                    color: "#faf9f5",
                    borderColor: "rgba(255,255,255,0.15)",
                  },
                }}
              />
            </Group>

            <Button
              variant="subtle"
              color={effectiveMuted ? "teal" : "yellow"}
              size="xs"
              leftSection={effectiveMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              onClick={toggleSound}
            >
              {effectiveMuted ? "Mode Roblox (Audio Mute ✓)" : "Mode Preview (Audio On)"}
            </Button>
          </Group>

          <Group gap="xs">
            {playbackState.isPlaying ? (
              <Group gap="xs">
                {playbackState.isPaused ? (
                  <Button
                    color="coral"
                    size="sm"
                    radius="md"
                    leftSection={<Play size={16} fill="currentColor" />}
                    onClick={onResumePlayback}
                  >
                    {t("player.resumeF6")}
                  </Button>
                ) : (
                  <Button
                    color="gray"
                    size="sm"
                    radius="md"
                    leftSection={<Pause size={16} fill="currentColor" />}
                    onClick={onPausePlayback}
                  >
                    {t("player.pauseF6")}
                  </Button>
                )}
                <Button
                  color="red"
                  variant="light"
                  size="sm"
                  radius="md"
                  leftSection={<Square size={14} fill="currentColor" />}
                  onClick={onStopPlayback}
                >
                  {t("player.stopEsc")}
                </Button>
              </Group>
            ) : playbackState.isCountdown ? (
              <Button
                color="red"
                size="sm"
                radius="md"
                leftSection={<Square size={15} fill="currentColor" />}
                onClick={onStopPlayback}
              >
                {t("common.cancel")} ({playbackState.countdownSec}s)
              </Button>
            ) : (
              <Button
                color="coral"
                size="sm"
                radius="md"
                leftSection={<Play size={16} fill="currentColor" />}
                onClick={() => onStartPlayback(sheet, startIndex)}
              >
                {startIndex > 0 ? `Auto Play #${startIndex + 1} (F6)` : t("player.autoPlayButton")}
              </Button>
            )}
          </Group>
        </Box>
      </Paper>
    </Box>
  );
};
