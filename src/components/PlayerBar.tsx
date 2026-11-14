import React, { useEffect } from "react";
import { Play, Pause, Square, Gauge, Clock, Music } from "lucide-react";
import { PianoSheet, PlaybackState } from "../lib/types";
import { useTranslation } from "../i18n";
import {
  Box,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  Progress,
  SegmentedControl,
} from "@mantine/core";

interface PlayerBarProps {
  selectedSheet: PianoSheet | null;
  playbackState: PlaybackState;
  speedMultiplier: number;
  setSpeedMultiplier: (speed: number) => void;
  countdownSec: number;
  setCountdownSec: (sec: number) => void;
  onStartPlayback: () => void;
  onPausePlayback?: () => void;
  onResumePlayback?: () => void;
  onStopPlayback: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  selectedSheet,
  playbackState,
  speedMultiplier,
  setSpeedMultiplier,
  countdownSec,
  setCountdownSec,
  onStartPlayback,
  onPausePlayback,
  onResumePlayback,
  onStopPlayback,
}) => {
  const { t } = useTranslation();

  // Global ESC key listener to stop immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (playbackState.isPlaying || playbackState.isCountdown)) {
        e.preventDefault();
        onStopPlayback();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playbackState.isPlaying, playbackState.isCountdown, onStopPlayback]);

  const percent =
    playbackState.totalEvents > 0
      ? Math.min(Math.round(((playbackState.currentIndex + 1) / playbackState.totalEvents) * 100), 100)
      : 0;

  return (
    <Box
      component="footer"
      px="lg"
      py="xs"
      style={{
        borderTop: "1px solid var(--hairline)",
        backgroundColor: "var(--canvas)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
        minHeight: 70,
      }}
    >
      {/* Left: Active Song Info */}
      <Group gap="sm" style={{ minWidth: 220, flex: "0 1 auto" }}>
        <Box
          style={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            backgroundColor: "var(--surface-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)",
          }}
        >
          <Music size={18} />
        </Box>
        <Box style={{ maxWidth: 220 }}>
          {selectedSheet ? (
            <>
              <Text size="xs" fw={700} truncate c="var(--ink)">
                {selectedSheet.title}
              </Text>
              <Text size="10px" c="dimmed" truncate>
                {selectedSheet.artist} • {selectedSheet.bpm} BPM • {selectedSheet.difficulty}
              </Text>
            </>
          ) : (
            <>
              <Text size="xs" fw={600} c="dimmed">
                {t("player.noSongSelected")}
              </Text>
              <Text size="10px" c="dimmed">
                {t("player.selectSongPrompt")}
              </Text>
            </>
          )}
        </Box>
      </Group>

      {/* Middle: Controls & Progress */}
      <Stack gap={6} align="center" style={{ flex: "1 1 320px", maxWidth: 500 }}>
        <Group gap="xs">
          {playbackState.isPlaying ? (
            <Group gap="xs">
              {playbackState.isPaused ? (
                <Button
                  color="coral"
                  size="xs"
                  radius="pill"
                  leftSection={<Play size={14} fill="currentColor" />}
                  onClick={onResumePlayback}
                >
                  {t("player.resumeF6")}
                </Button>
              ) : (
                <Button
                  color="gray"
                  size="xs"
                  radius="pill"
                  leftSection={<Pause size={14} fill="currentColor" />}
                  onClick={onPausePlayback}
                >
                  {t("player.pauseF6")}
                </Button>
              )}
              <Button
                color="red"
                variant="light"
                size="xs"
                radius="pill"
                leftSection={<Square size={13} fill="currentColor" />}
                onClick={onStopPlayback}
              >
                {t("player.stopEsc")}
              </Button>
            </Group>
          ) : playbackState.isCountdown ? (
            <Button
              color="red"
              size="xs"
              radius="pill"
              leftSection={<Square size={14} fill="currentColor" />}
              onClick={onStopPlayback}
            >
              {t("common.cancel")} ({playbackState.countdownSec}s)
            </Button>
          ) : (
            <Button
              color="coral"
              size="xs"
              radius="pill"
              disabled={!selectedSheet}
              leftSection={<Play size={14} fill="currentColor" />}
              onClick={onStartPlayback}
            >
              {t("player.autoPlayButton")}
            </Button>
          )}
        </Group>

        <Group gap="xs" style={{ width: "100%" }}>
          <Badge size="xs" variant="outline" color={playbackState.isPlaying ? "coral" : "gray"}>
            {playbackState.isPlaying ? playbackState.currentNoteDisplay || "..." : t("common.ready")}
          </Badge>
          <Progress
            value={percent}
            color="coral"
            size="sm"
            radius="xl"
            style={{ flex: 1, backgroundColor: "var(--surface-cream-strong)" }}
          />
          <Text size="10px" c="dimmed" style={{ minWidth: 60, textAlign: "right" }}>
            {playbackState.isPlaying
              ? `${percent}%`
              : selectedSheet
              ? `${selectedSheet.bpm} BPM`
              : "0%"}
          </Text>
        </Group>
      </Stack>

      {/* Right: Speed & Jeda Controls */}
      <Group gap="md">
        <Box>
          <Group gap={4} mb={2}>
            <Gauge size={12} color="var(--muted)" />
            <Text size="10px" c="dimmed" fw={600}>
              {t("common.speed")}
            </Text>
          </Group>
          <SegmentedControl
            size="xs"
            value={speedMultiplier.toString()}
            onChange={(val) => setSpeedMultiplier(parseFloat(val))}
            data={[
              { label: "0.75x", value: "0.75" },
              { label: "1x", value: "1" },
              { label: "1.25x", value: "1.25" },
              { label: "1.5x", value: "1.5" },
            ]}
            color="coral"
          />
        </Box>

        <Box>
          <Group gap={4} mb={2}>
            <Clock size={12} color="var(--muted)" />
            <Text size="10px" c="dimmed" fw={600}>
              {t("player.countdownSec")}
            </Text>
          </Group>
          <SegmentedControl
            size="xs"
            value={countdownSec.toString()}
            onChange={(val) => setCountdownSec(parseInt(val, 10))}
            data={[
              { label: "0s", value: "0" },
              { label: "2s", value: "2" },
              { label: "3s", value: "3" },
              { label: "5s", value: "5" },
            ]}
            color="coral"
          />
        </Box>
      </Group>
    </Box>
  );
};
