import React, { useState, useRef } from "react";
import { Search, Play, Eye, Music2, Sparkles, Plus, Globe, Pencil, Download, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { PianoSheet, Difficulty, UserProfile } from "../lib/types";
import { useTranslation } from "../i18n";
import { exportSheetAsTxt, exportLibraryAsJson, parseImportedFileContent } from "../lib/sheet-export-import";
import {
  Box,
  SimpleGrid,
  Card,
  Title,
  Text,
  TextInput,
  SegmentedControl,
  Button,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
  Paper,
  Alert,
  Stack,
} from "@mantine/core";

interface SongLibraryProps {
  sheets: PianoSheet[];
  selectedSheet: PianoSheet | null;
  onSelectSheet: (sheet: PianoSheet) => void;
  onStartPlay: (sheet: PianoSheet) => void;
  onOpenInteractiveViewer: (sheet: PianoSheet) => void;
  onEditSheet?: (sheet: PianoSheet) => void;
  user: UserProfile | null;
  onOpenPricing?: () => void;
  onNavigateUpload?: () => void;
  onOpenSync?: () => void;
  onBulkImportSheets?: (sheets: Omit<PianoSheet, "id">[]) => Promise<void>;
}

export const SongLibrary: React.FC<SongLibraryProps> = ({
  sheets,
  selectedSheet,
  onSelectSheet,
  onStartPlay,
  onOpenInteractiveViewer,
  onEditSheet,
  user: _user,
  onNavigateUpload,
  onOpenSync,
  onBulkImportSheets,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [importNotice, setImportNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseImportedFileContent(text, file.name);

        if (result.errors || result.sheets.length === 0) {
          setImportNotice({
            type: "error",
            text: result.errors || "Tidak dapat memuat partitur dari berkas ini.",
          });
          return;
        }

        if (onBulkImportSheets) {
          await onBulkImportSheets(result.sheets);
          setImportNotice({
            type: "success",
            text: t("exportImport.importSuccessMsg", { count: result.sheets.length }),
          });
        }
      } catch (err) {
        setImportNotice({
          type: "error",
          text: `Gagal membaca berkas: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Empty state when library has no sheets yet
  if (sheets.length === 0) {
    return (
      <Box p="xl" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 460 }}>
        <Paper p="xl" radius="lg" withBorder style={{ textAlign: "center", maxWidth: 540, backgroundColor: "var(--surface-card)" }}>
          <Music2 size={44} color="#cc785c" style={{ margin: "0 auto 12px" }} />
          <Title order={3} mb="xs" fw={700}>
            {t("library.emptyTitle")}
          </Title>
          <Text size="sm" c="dimmed" mb="lg">
            {t("library.emptyDesc")}
          </Text>
          <Group justify="center" gap="sm">
            {onNavigateUpload && (
              <Button color="coral" leftSection={<Plus size={16} />} onClick={onNavigateUpload}>
                {t("library.uploadTxt")}
              </Button>
            )}
            {onOpenSync && (
              <Button variant="default" leftSection={<Globe size={16} />} onClick={onOpenSync}>
                {t("library.syncPlayPianoSheets")}
              </Button>
            )}
          </Group>
        </Paper>
      </Box>
    );
  }

  const filteredSheets = sheets.filter((sheet) => {
    const matchesSearch =
      sheet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.tags?.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDifficulty =
      difficultyFilter === "all" || sheet.difficulty.toLowerCase() === difficultyFilter.toLowerCase();

    return matchesSearch && matchesDifficulty;
  });

  const featuredSheet = sheets[0];

  const handlePlayClick = (sheet: PianoSheet, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectSheet(sheet);
    onStartPlay(sheet);
  };

  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case "Easy":
        return "teal";
      case "Normal":
        return "blue";
      case "Hard":
        return "red";
      default:
        return "gray";
    }
  };

  return (
    <Box p="lg" style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Featured Banner */}
      {featuredSheet && (
        <Paper
          p="lg"
          radius="lg"
          withBorder
          mb="lg"
          style={{
            backgroundColor: "var(--surface-card)",
            borderColor: "rgba(204,120,92,0.4)",
            boxShadow: "var(--surface-card-shadow)",
          }}
        >
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Box style={{ flex: 1, minWidth: 280 }}>
              <Badge color="coral" variant="light" size="sm" mb="xs" leftSection={<Sparkles size={12} />}>
                LAGU UTAMA
              </Badge>
              <Title order={3} fw={700} mb={4}>
                {featuredSheet.title} – {featuredSheet.artist}
              </Title>
              <Text size="xs" c="dimmed" mb="md">
                {featuredSheet.description || "Dilengkapi notasi keyboard presisi dan timing otomatis PlayPianoSheets."}
              </Text>

              <Group gap="xs">
                <Button
                  color="coral"
                  size="xs"
                  leftSection={<Play size={14} fill="currentColor" />}
                  onClick={() => {
                    onSelectSheet(featuredSheet);
                    onStartPlay(featuredSheet);
                  }}
                >
                  Mulai AutoPlay (F6)
                </Button>
                <Button
                  variant="default"
                  size="xs"
                  leftSection={<Eye size={14} />}
                  onClick={() => {
                    onSelectSheet(featuredSheet);
                    onOpenInteractiveViewer(featuredSheet);
                  }}
                >
                  Tampilan Notasi
                </Button>
                {onEditSheet && (
                  <Button
                    variant="default"
                    size="xs"
                    leftSection={<Pencil size={14} color="#cc785c" />}
                    onClick={() => {
                      onSelectSheet(featuredSheet);
                      onEditSheet(featuredSheet);
                    }}
                  >
                    Edit Sheet & BPM
                  </Button>
                )}
              </Group>
            </Box>

            <Group gap="xs">
              <Badge color={getDifficultyColor(featuredSheet.difficulty)} size="sm">
                {featuredSheet.difficulty}
              </Badge>
              <Badge color="gray" variant="outline" size="sm">
                {featuredSheet.bpm} BPM
              </Badge>
            </Group>
          </Group>
        </Paper>
      )}

      {/* Search & Filters & Export/Import */}
      <Paper
        p="sm"
        radius="lg"
        withBorder
        mb="lg"
        style={{
          backgroundColor: "var(--surface-card)",
          boxShadow: "var(--surface-card-shadow)",
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".json,.txt"
          style={{ display: "none" }}
          onChange={handleFileImport}
        />

        <Stack gap="sm">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <TextInput
              placeholder={t("library.searchPlaceholder")}
              leftSection={<Search size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 240 }}
            />

            <Group gap="xs" wrap="wrap">
              <SegmentedControl
                size="xs"
                value={difficultyFilter}
                onChange={setDifficultyFilter}
                data={[
                  { label: t("library.allLevels"), value: "all" },
                  { label: t("library.easy"), value: "Easy" },
                  { label: t("library.normal"), value: "Normal" },
                  { label: t("library.hard"), value: "Hard" },
                ]}
                color="coral"
              />

              <Button
                variant="default"
                size="xs"
                leftSection={<Download size={14} color="#cc785c" />}
                onClick={() => exportLibraryAsJson(sheets)}
              >
                {t("library.exportCollection")}
              </Button>

              <Button
                variant="default"
                size="xs"
                leftSection={<Upload size={14} color="#cc785c" />}
                onClick={() => fileInputRef.current?.click()}
              >
                {t("library.importCollection")}
              </Button>
            </Group>
          </Group>

          {importNotice && (
            <Alert
              icon={
                importNotice.type === "success" ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertCircle size={16} />
                )
              }
              color={importNotice.type === "success" ? "teal" : "red"}
              variant="light"
              withCloseButton
              onClose={() => setImportNotice(null)}
            >
              {importNotice.text}
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Song Cards Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {filteredSheets.map((sheet) => {
          const isSelected = selectedSheet?.id === sheet.id;

          return (
            <Card
              key={sheet.id}
              shadow="xs"
              padding="md"
              radius="lg"
              withBorder
              onClick={() => onSelectSheet(sheet)}
              style={{
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backgroundColor: isSelected
                  ? "var(--surface-card-selected)"
                  : "var(--surface-card)",
                borderColor: isSelected ? "var(--primary)" : "var(--hairline)",
                borderWidth: isSelected ? 2 : 1,
                boxShadow: isSelected
                  ? "0 0 0 1px var(--primary)"
                  : "var(--surface-card-shadow)",
                transform: isSelected ? "translateY(-1px)" : "none",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <Box>
                <Group justify="space-between" mb="xs">
                  <Badge color={getDifficultyColor(sheet.difficulty)} size="xs">
                    {sheet.difficulty}
                  </Badge>
                  <Badge color="gray" variant="outline" size="xs">
                    {t("common.openSource")}
                  </Badge>
                </Group>

                <Title order={5} lineClamp={1} fw={700}>
                  {sheet.title}
                </Title>
                <Text size="xs" c="dimmed" truncate mb="sm">
                  {sheet.artist}
                </Text>

                <Group gap="xs" mb="md">
                  <Badge variant="outline" color="gray" size="xs">
                    {sheet.bpm} BPM
                  </Badge>
                  {sheet.tags && sheet.tags[0] && (
                    <Badge variant="light" color="gray" size="xs">
                      {sheet.tags[0]}
                    </Badge>
                  )}
                </Group>
              </Box>

              <Group justify="space-between" pt="xs" style={{ borderTop: "1px solid var(--hairline)" }}>
                <Group gap={6}>
                  <Tooltip label={t("player.notationView")} withArrow>
                    <ActionIcon
                      variant="default"
                      size="md"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSheet(sheet);
                        onOpenInteractiveViewer(sheet);
                      }}
                    >
                      <Eye size={16} />
                    </ActionIcon>
                  </Tooltip>

                  {onEditSheet && (
                    <Tooltip label={t("player.editSheetTooltip")} withArrow>
                      <ActionIcon
                        variant="default"
                        size="md"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSheet(sheet);
                          onEditSheet(sheet);
                        }}
                      >
                        <Pencil size={15} color="#cc785c" />
                      </ActionIcon>
                    </Tooltip>
                  )}

                  <Tooltip label={t("library.downloadTxt")} withArrow>
                    <ActionIcon
                      variant="default"
                      size="md"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSheetAsTxt(sheet);
                      }}
                      aria-label={t("library.downloadTxt")}
                    >
                      <Download size={15} color="#cc785c" />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                <Button
                  color="coral"
                  variant="filled"
                  size="xs"
                  leftSection={<Play size={14} fill="currentColor" />}
                  onClick={(e) => handlePlayClick(sheet, e)}
                >
                  {t("player.autoPlayButton")}
                </Button>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};
