import React, { useState } from "react";
import { Upload, Download, FileText, CheckCircle, AlertCircle, Play, Trash2, Plus, Minus, Music, Sparkles, Pencil, RotateCcw } from "lucide-react";
import { PianoSheet, Difficulty, UserProfile } from "../lib/types";
import { parseSheetLocally } from "../lib/sheets-parser";
import { useTranslation } from "../i18n";
import { exportSheetAsTxt, exportLibraryAsJson, parseImportedFileContent } from "../lib/sheet-export-import";
import {
  Box,
  SimpleGrid,
  Paper,
  Title,
  Text,
  TextInput,
  Select,
  Slider,
  Textarea,
  Button,
  Group,
  Stack,
  Badge,
  Alert,
  ActionIcon,
  Tooltip,
  FileButton,
} from "@mantine/core";

interface SheetUploaderProps {
  customSheets: PianoSheet[];
  onSaveSheet: (sheet: (Omit<PianoSheet, "id"> & { id?: string }) | PianoSheet) => Promise<void>;
  onDeleteSheet: (id: string) => Promise<void>;
  onSelectSheet: (sheet: PianoSheet) => void;
  onStartPlay: (sheet: PianoSheet) => void;
  user: UserProfile | null;
  onOpenPricing?: () => void;
  onBulkImportSheets?: (sheets: Omit<PianoSheet, "id">[]) => Promise<void>;
}

export const SheetUploader: React.FC<SheetUploaderProps> = ({
  customSheets,
  onSaveSheet,
  onDeleteSheet,
  onSelectSheet,
  onStartPlay,
  user,
  onBulkImportSheets,
}) => {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Normal");
  const [bpm, setBpm] = useState<number>(120);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleStartEdit = (sheet: PianoSheet) => {
    setEditingId(sheet.id);
    setTitle(sheet.title);
    setArtist(sheet.artist || "");
    setDifficulty(sheet.difficulty);
    setBpm(sheet.bpm);
    setContent(sheet.content);
    setStatusMessage({
      type: "success",
      text: `Memuat "${sheet.title}" ke editor. Anda dapat menyesuaikan tempo BPM, judul, atau notasinya.`,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setArtist("");
    setBpm(120);
    setDifficulty("Normal");
    setContent("");
    setStatusMessage(null);
  };

  // Realtime parse analysis
  const parseResult = content.trim() ? parseSheetLocally(content, bpm) : null;
  const chordCount = parseResult?.events.filter((e) => e.is_chord).length || 0;

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const result = parseImportedFileContent(text, file.name);
      if (result.errors || result.sheets.length === 0) {
        setStatusMessage({
          type: "error",
          text: result.errors || `Gagal memuat berkas "${file.name}"`,
        });
        return;
      }

      // If multiple sheets in JSON, perform bulk import!
      if (result.sheets.length > 1 && onBulkImportSheets) {
        await onBulkImportSheets(result.sheets);
        setStatusMessage({
          type: "success",
          text: `Berhasil mengimpor ${result.sheets.length} partitur dari "${file.name}" ke koleksi Anda!`,
        });
        return;
      }

      // Single sheet: populate editor form
      const single = result.sheets[0];
      setTitle(single.title);
      setArtist(single.artist);
      setBpm(single.bpm);
      setDifficulty(single.difficulty);
      setContent(single.content);
      setStatusMessage({
        type: "success",
        text: `Partitur "${single.title}" (${single.bpm} BPM) berhasil dimuat ke formulir editor!`,
      });
    };
    reader.readAsText(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatusMessage({ type: "error", text: "Judul lagu wajib diisi!" });
      return;
    }
    if (!content.trim()) {
      setStatusMessage({ type: "error", text: "Notasi piano tidak boleh kosong!" });
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    try {
      await onSaveSheet({
        id: editingId || undefined,
        title: title.trim(),
        artist: artist.trim() || "Custom / Unknown",
        difficulty,
        bpm: Number(bpm) || 120,
        content: content.trim(),
        isPremium: false,
        description: `Custom sheet diupload oleh ${user?.name || "pengguna"}`,
      });

      setStatusMessage({
        type: "success",
        text: editingId
          ? `Perubahan pada partitur "${title}" (Tempo ${bpm} BPM) berhasil diperbarui!`
          : `Sheet "${title}" berhasil disimpan ke koleksi Anda!`,
      });

      // Reset form
      setEditingId(null);
      setTitle("");
      setArtist("");
      setContent("");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gagal menyimpan sheet";
      setStatusMessage({ type: "error", text: errMsg });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSample = () => {
    setTitle("Golden Hour (Sample Fast Arpeggios)");
    setArtist("JVKE");
    setBpm(130);
    setDifficulty("Hard");
    setContent(`[9e] y i p d y i p d y i p 
[8w] y i p d y i p d y i p 
[7w] y i o a y i o a y i o 
[60] e u p s e u p s e u p 
[9ed] [8ws] [7wa] [60p]`);
  };

  return (
    <Box p="lg" style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Top Banner */}
      <Group justify="space-between" mb="lg" wrap="wrap">
        <Box>
          <Title order={3} fw={700}>
            {t("uploader.title")}
          </Title>
          <Text size="xs" c="dimmed">
            {t("uploader.subtitle")}
          </Text>
        </Box>

        <Badge color="teal" variant="light" size="lg" leftSection={<Sparkles size={14} />}>
          {t("uploader.unlimitedSheets", { count: customSheets.length })}
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        {/* Editor Form (Takes 2 Columns) */}
        <Box style={{ gridColumn: "span 2" }}>
          <Paper p="lg" radius="lg" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <Badge color={editingId ? "blue" : "coral"} variant="filled" size="xs">
                  {editingId ? t("uploader.editSheetMode") : t("uploader.newSheetMode")}
                </Badge>
                {editingId && (
                  <Button
                    variant="subtle"
                    color="gray"
                    size="compact-xs"
                    leftSection={<RotateCcw size={12} />}
                    onClick={handleCancelEdit}
                  >
                    {t("uploader.cancelEdit")}
                  </Button>
                )}
              </Group>
              {!editingId && (
                <Button
                  variant="subtle"
                  color="coral"
                  size="xs"
                  leftSection={<Sparkles size={14} />}
                  onClick={handleLoadSample}
                >
                  {t("uploader.useSample")}
                </Button>
              )}
            </Group>

            <form onSubmit={handleSave}>
              <Stack gap="sm">
                <Group grow>
                  <TextInput
                    label="Judul Lagu *"
                    placeholder="Contoh: Golden Hour"
                    value={title}
                    onChange={(e) => setTitle(e.currentTarget.value)}
                    required
                  />
                  <TextInput
                    label="Artis / Penggubah"
                    placeholder="Contoh: JVKE"
                    value={artist}
                    onChange={(e) => setArtist(e.currentTarget.value)}
                  />
                </Group>

                <Group grow>
                  <Select
                    label={t("uploader.difficultyLabel")}
                    value={difficulty}
                    onChange={(val) => setDifficulty((val as Difficulty) || "Normal")}
                    data={[
                      { value: "Easy", label: "Easy" },
                      { value: "Normal", label: "Normal" },
                      { value: "Hard", label: "Hard" },
                    ]}
                  />

                  <Box>
                    <Group justify="space-between" mb={4}>
                      <Text size="sm" fw={500}>
                        {t("uploader.tempoBpm", { bpm })}
                      </Text>
                      <Group gap={4}>
                        <ActionIcon
                          size="xs"
                          variant="default"
                          onClick={() => setBpm((b) => Math.max(40, b - 5))}
                        >
                          <Minus size={12} />
                        </ActionIcon>
                        <ActionIcon
                          size="xs"
                          variant="default"
                          onClick={() => setBpm((b) => Math.min(240, b + 5))}
                        >
                          <Plus size={12} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <Slider
                      value={bpm}
                      onChange={setBpm}
                      min={40}
                      max={240}
                      step={5}
                      color="coral"
                      size="sm"
                    />
                  </Box>
                </Group>

                {/* File Upload Button */}
                <FileButton onChange={handleFileChange} accept=".txt,.json">
                  {(props) => (
                    <Button
                      {...props}
                      variant="outline"
                      color="gray"
                      fullWidth
                      leftSection={<Upload size={16} />}
                      styles={{
                        root: {
                          borderStyle: "dashed",
                          height: "46px",
                          backgroundColor: "var(--surface-soft)",
                        },
                      }}
                    >
                      {t("exportImport.importButton")}
                    </Button>
                  )}
                </FileButton>

                {/* Notation Textarea */}
                <Textarea
                  label={t("uploader.notationLabel")}
                  description={t("uploader.notationDesc")}
                  placeholder="Paste notation here... Example:&#10;[9e] y i p d y i p d y i p&#10;[8w] y i p d y i p d y i p"
                  minRows={8}
                  maxRows={14}
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

                {/* Realtime Analysis Summary */}
                {parseResult && parseResult.events.length > 0 && (
                  <Paper p="xs" radius="md" style={{ backgroundColor: "var(--surface-soft)" }}>
                    <Group justify="space-around">
                      <Box ta="center">
                        <Text fw={700} size="sm" c="coral.6">
                          {parseResult.total_notes}
                        </Text>
                        <Text size="10px" c="dimmed">
                          Total Nada
                        </Text>
                      </Box>
                      <Box ta="center">
                        <Text fw={700} size="sm" c="coral.6">
                          {chordCount}
                        </Text>
                        <Text size="10px" c="dimmed">
                          Akord [ ]
                        </Text>
                      </Box>
                      <Box ta="center">
                        <Text fw={700} size="sm" c="coral.6">
                          {parseResult.estimated_duration_sec}s
                        </Text>
                        <Text size="10px" c="dimmed">
                          Estimasi Durasi
                        </Text>
                      </Box>
                      <Box ta="center">
                        <Badge color="teal" size="xs">
                          Siap
                        </Badge>
                        <Text size="10px" c="dimmed">
                          Status
                        </Text>
                      </Box>
                    </Group>
                  </Paper>
                )}

                {statusMessage && (
                  <Alert
                    icon={statusMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    color={statusMessage.type === "success" ? "teal" : "red"}
                    variant="light"
                  >
                    {statusMessage.text}
                  </Alert>
                )}

                <Group justify="flex-end" mt="xs">
                  <Button
                    variant="default"
                    disabled={!content.trim()}
                    leftSection={<Play size={16} fill="currentColor" />}
                    onClick={() => {
                      if (parseResult) {
                        const tempSheet: PianoSheet = {
                          id: "temp_preview",
                          title: title || "Preview Sheet",
                          artist: artist || "Custom",
                          difficulty,
                          bpm,
                          content,
                          isPremium: false,
                        };
                        onSelectSheet(tempSheet);
                        onStartPlay(tempSheet);
                      }
                    }}
                  >
                    {t("uploader.testPlayDirectly")}
                  </Button>
                  <Button
                    type="submit"
                    color="coral"
                    disabled={saving || !content.trim()}
                    loading={saving}
                    leftSection={editingId ? <CheckCircle size={16} /> : <Plus size={16} />}
                  >
                    {editingId ? t("uploader.updateSheetBpm") : t("uploader.saveToLibrary")}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Paper>
        </Box>

        {/* Custom Sheets List Sidebar (Takes 1 Column) */}
        <Box>
          <Paper p="md" radius="lg" withBorder style={{ backgroundColor: "var(--surface-card)", height: "100%" }}>
            <Group justify="space-between" mb="sm" wrap="wrap">
              <Group gap="xs">
                <FileText size={16} color="#cc785c" />
                <Title order={5} fw={700}>
                  {t("uploader.yourSheetsList", { count: customSheets.length })}
                </Title>
              </Group>
              <Group gap="xs">
                {customSheets.length > 0 && (
                  <Button
                    variant="default"
                    size="compact-xs"
                    leftSection={<Download size={12} color="#cc785c" />}
                    onClick={() => exportLibraryAsJson(customSheets, "my-custom-sheets.json")}
                  >
                    {t("exportImport.exportCollectionJson")}
                  </Button>
                )}
                <Badge size="xs" variant="outline" color="gray">
                  {t("uploader.badgeSaved")}
                </Badge>
              </Group>
            </Group>

            <Stack gap="xs" style={{ maxHeight: 600, overflowY: "auto" }}>
              {customSheets.length === 0 ? (
                <Paper p="xl" radius="md" ta="center" style={{ backgroundColor: "var(--surface-soft)" }}>
                  <Music size={28} color="var(--muted)" style={{ margin: "0 auto 8px" }} />
                  <Text size="xs" c="dimmed">
                    {t("uploader.emptyList")}
                  </Text>
                </Paper>
              ) : (
                customSheets.map((s) => (
                  <Paper
                    key={s.id}
                    p="xs"
                    radius="md"
                    withBorder
                    style={{
                      backgroundColor: "var(--surface-soft)",
                      borderColor: "var(--hairline)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" fw={600} truncate c="var(--ink)">
                          {s.title}
                        </Text>
                        <Text size="10px" c="dimmed" truncate>
                          {s.artist} • {s.bpm} BPM • {s.difficulty}
                        </Text>
                      </Box>
                      <Group gap={4}>
                        <Tooltip label={t("exportImport.exportSingleTxt")} withArrow>
                          <ActionIcon
                            color="teal"
                            size="sm"
                            variant="subtle"
                            onClick={() => exportSheetAsTxt(s)}
                            aria-label={t("exportImport.exportSingleTxt")}
                          >
                            <Download size={12} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Edit Partitur & Tempo BPM" withArrow>
                          <ActionIcon
                            color="blue"
                            size="sm"
                            variant="subtle"
                            onClick={() => handleStartEdit(s)}
                          >
                            <Pencil size={12} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Mainkan" withArrow>
                          <ActionIcon
                            color="coral"
                            size="sm"
                            variant="filled"
                            onClick={() => {
                              onSelectSheet(s);
                              onStartPlay(s);
                            }}
                          >
                            <Play size={12} fill="currentColor" />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Hapus" withArrow>
                          <ActionIcon
                            color="red"
                            size="sm"
                            variant="subtle"
                            onClick={() => onDeleteSheet(s.id)}
                          >
                            <Trash2 size={12} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Paper>
                ))
              )}
            </Stack>
          </Paper>
        </Box>
      </SimpleGrid>
    </Box>
  );
};
