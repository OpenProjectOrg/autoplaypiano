import React, { useState, useEffect } from "react";
import {
  Modal,
  TextInput,
  Select,
  Slider,
  Textarea,
  Button,
  Group,
  Stack,
  Badge,
  Text,
  Paper,
  ActionIcon,
  Alert,
  Box,
} from "@mantine/core";
import {
  Music,
  Minus,
  Plus,
  Save,
  CheckCircle,
  AlertCircle,
  Activity,
  Layers,
} from "lucide-react";
import { PianoSheet, Difficulty } from "../lib/types";
import { parseSheetLocally } from "../lib/sheets-parser";
import { useTranslation } from "../i18n";

interface EditSheetModalProps {
  opened: boolean;
  onClose: () => void;
  sheet: PianoSheet | null;
  onSave: (updatedSheet: PianoSheet) => Promise<void>;
}

export const EditSheetModal: React.FC<EditSheetModalProps> = ({
  opened,
  onClose,
  sheet,
  onSave,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Normal");
  const [bpm, setBpm] = useState<number>(120);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Populate form whenever sheet changes
  useEffect(() => {
    if (sheet) {
      setTitle(sheet.title);
      setArtist(sheet.artist || "");
      setDifficulty(sheet.difficulty || "Normal");
      setBpm(sheet.bpm || 120);
      setContent(sheet.content || "");
      setStatusMessage(null);
    }
  }, [sheet, opened]);

  // Real-time analysis with the new BPM
  const parseResult = content.trim() ? parseSheetLocally(content, bpm) : null;
  const chordCount = parseResult?.events.filter((e) => e.is_chord).length || 0;
  const durationSec = parseResult?.estimated_duration_sec || 0;
  const durationMin = Math.floor(durationSec / 60);
  const durationRemSec = durationSec % 60;
  const durationFormatted = `${durationMin}m ${durationRemSec < 10 ? "0" : ""}${durationRemSec}s`;

  const bpmPresets = [70, 90, 110, 120, 130, 140, 160];

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheet) return;

    if (!title.trim()) {
      setStatusMessage({ type: "error", text: "Judul lagu tidak boleh kosong!" });
      return;
    }
    if (!content.trim()) {
      setStatusMessage({ type: "error", text: "Notasi piano tidak boleh kosong!" });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const updated: PianoSheet = {
        ...sheet,
        title: title.trim(),
        artist: artist.trim() || "Custom",
        difficulty,
        bpm: Number(bpm) || 120,
        content: content.trim(),
      };

      await onSave(updated);
      setStatusMessage({
        type: "success",
        text: `Partitur "${title}" dan tempo ${bpm} BPM berhasil diperbarui!`,
      });

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gagal memperbarui sheet";
      setStatusMessage({ type: "error", text: errMsg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Box
            style={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              backgroundColor: "var(--surface-dark)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)",
            }}
          >
            <Music size={16} />
          </Box>
          <Box>
            <Text fw={700} size="sm" c="var(--ink)">
              {t("editModal.title")}
            </Text>
            <Text size="11px" c="dimmed">
              {t("editModal.subtitle")}
            </Text>
          </Box>
        </Group>
      }
      size="lg"
      centered
      radius="lg"
      styles={{
        content: {
          backgroundColor: "var(--canvas)",
          border: "1px solid var(--hairline)",
        },
        header: {
          backgroundColor: "var(--canvas)",
          borderBottom: "1px solid var(--hairline)",
          paddingBottom: "12px",
        },
      }}
    >
      <form onSubmit={handleFormSubmit}>
        <Stack gap="md" pt="xs">
          {/* Title & Artist */}
          <Group grow>
            <TextInput
              label={t("uploader.songTitleLabel")}
              placeholder={t("uploader.songTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              required
            />
            <TextInput
              label={t("uploader.artistLabel")}
              placeholder={t("uploader.artistPlaceholder")}
              value={artist}
              onChange={(e) => setArtist(e.currentTarget.value)}
            />
          </Group>

          {/* Difficulty & BPM Setting */}
          <Paper
            p="sm"
            radius="md"
            withBorder
            style={{ backgroundColor: "var(--surface-card)" }}
          >
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="var(--ink)">
                  {t("editModal.tempoDifficultyTitle")}
                </Text>
                <Badge color="coral" variant="filled" size="sm">
                  {bpm} BPM
                </Badge>
              </Group>

              <Group grow align="flex-start">
                <Select
                  label={t("uploader.difficultyLabel")}
                  value={difficulty}
                  onChange={(val) => setDifficulty((val as Difficulty) || "Normal")}
                  data={[
                    { value: "Easy", label: "Easy" },
                    { value: "Normal", label: "Normal" },
                    { value: "Hard", label: "Hard" },
                  ]}
                  style={{ maxWidth: 220 }}
                />

                <Box style={{ flex: 1 }}>
                  <Group justify="space-between" mb={4}>
                    <Text size="xs" fw={500} c="var(--body)">
                      {t("editModal.playbackTempo")}
                    </Text>
                    <Group gap={4}>
                      <ActionIcon
                        size="xs"
                        variant="default"
                        onClick={() => setBpm((b) => Math.max(30, b - 5))}
                        aria-label={t("editModal.decreaseBpm")}
                      >
                        <Minus size={12} />
                      </ActionIcon>
                      <ActionIcon
                        size="xs"
                        variant="default"
                        onClick={() => setBpm((b) => Math.min(260, b + 5))}
                        aria-label={t("editModal.increaseBpm")}
                      >
                        <Plus size={12} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  <Slider
                    value={bpm}
                    onChange={setBpm}
                    min={40}
                    max={220}
                    step={5}
                    color="coral"
                    size="sm"
                    mb="xs"
                  />

                  {/* Preset Quick BPM Buttons */}
                  <Group gap={4} wrap="wrap">
                    <Text size="10px" c="dimmed" mr={4}>
                      {t("editModal.quickBpm")}
                    </Text>
                    {bpmPresets.map((preset) => (
                      <Button
                        key={preset}
                        size="compact-xs"
                        variant={bpm === preset ? "filled" : "subtle"}
                        color={bpm === preset ? "coral" : "gray"}
                        onClick={() => setBpm(preset)}
                        style={{ height: 20, fontSize: "10.5px" }}
                      >
                        {preset}
                      </Button>
                    ))}
                  </Group>
                </Box>
              </Group>
            </Stack>
          </Paper>

          {/* Notation Textarea */}
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="xs" fw={600} c="var(--ink)">
                {t("uploader.notationLabel")}
              </Text>
              <Text size="11px" c="dimmed">
                {t("editModal.notationHelp")}
              </Text>
            </Group>
            <Textarea
              minRows={6}
              maxRows={12}
              autosize
              value={content}
              onChange={(e) => setContent(e.currentTarget.value)}
              styles={{
                input: {
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  backgroundColor: "var(--surface-dark)",
                  color: "#faf9f5",
                  borderColor: "rgba(204,120,92,0.3)",
                },
              }}
              required
            />
          </Box>

          {/* Real-time Summary Card */}
          {parseResult && (
            <Paper p="xs" radius="md" style={{ backgroundColor: "var(--surface-soft)" }}>
              <Group justify="space-around">
                <Group gap={6}>
                  <Activity size={14} color="#cc785c" />
                  <Box>
                    <Text fw={700} size="xs" c="var(--ink)">
                      {parseResult.total_notes}
                    </Text>
                    <Text size="10px" c="dimmed">
                      {t("uploader.totalNotes")}
                    </Text>
                  </Box>
                </Group>

                <Group gap={6}>
                  <Layers size={14} color="#5db8a6" />
                  <Box>
                    <Text fw={700} size="xs" c="var(--ink)">
                      {chordCount}
                    </Text>
                    <Text size="10px" c="dimmed">
                      {t("uploader.chords")}
                    </Text>
                  </Box>
                </Group>

                <Group gap={6}>
                  <Music size={14} color="#e8a55a" />
                  <Box>
                    <Text fw={700} size="xs" c="var(--ink)">
                      {durationFormatted}
                    </Text>
                    <Text size="10px" c="dimmed">
                      {t("editModal.durationAtBpm", { bpm })}
                    </Text>
                  </Box>
                </Group>
              </Group>
            </Paper>
          )}

          {statusMessage && (
            <Alert
              icon={
                statusMessage.type === "success" ? (
                  <CheckCircle size={16} />
                ) : (
                  <AlertCircle size={16} />
                )
              }
              color={statusMessage.type === "success" ? "teal" : "red"}
              variant="light"
            >
              {statusMessage.text}
            </Alert>
          )}

          {/* Action Buttons */}
          <Group justify="flex-end" gap="xs" mt="xs">
            <Button variant="default" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              color="coral"
              loading={saving}
              leftSection={<Save size={15} />}
            >
              {t("editModal.saveChanges")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

