import React from "react";
import { UserProfile } from "../lib/types";
import { Globe, Terminal, Volume2, VolumeX, Sparkles, Sun, Moon, Languages } from "lucide-react";
import { NavView } from "./Sidebar";
import { useTranslation } from "../i18n";
import {
  Group,
  Stack,
  Title,
  Text,
  Badge,
  Button,
  Tooltip,
  Box,
  Kbd,
  ActionIcon,
  useMantineColorScheme,
} from "@mantine/core";

interface NavbarProps {
  currentView: NavView;
  user: UserProfile | null;
  onOpenPricing?: () => void;
  onOpenSync: () => void;
  isAudioMuted: boolean;
  onToggleAudioMute: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  user: _user,
  onOpenSync,
  isAudioMuted,
  onToggleAudioMute,
}) => {
  const { t, lang, toggleLang } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const isDesktop =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

  const viewTitles: Record<NavView, { title: string; subtitle: string }> = {
    player: {
      title: t("navbar.titles.player"),
      subtitle: t("navbar.titles.playerSub"),
    },
    library: {
      title: t("navbar.titles.library"),
      subtitle: t("navbar.titles.librarySub"),
    },
    upload: {
      title: t("navbar.titles.upload"),
      subtitle: t("navbar.titles.uploadSub"),
    },
    profile: {
      title: t("navbar.titles.profile"),
      subtitle: t("navbar.titles.profileSub"),
    },
    guide: {
      title: t("navbar.titles.guide"),
      subtitle: t("navbar.titles.guideSub"),
    },
  };

  const currentInfo = viewTitles[currentView] || viewTitles.player;

  return (
    <Box
      component="header"
      px="lg"
      py="md"
      style={{
        borderBottom: "1px solid var(--hairline)",
        backgroundColor: "var(--canvas)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
      }}
    >
      {/* Title & Subtitle with Crisp Inter */}
      <Stack gap={2} style={{ minWidth: 260 }}>
        <Title
          order={2}
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          {currentInfo.title}
        </Title>
        <Text size="xs" c="dimmed">
          {currentInfo.subtitle}
        </Text>
      </Stack>

      {/* Meta Indicators & Action Buttons */}
      <Group gap="xs" wrap="wrap">
        {/* Desktop Connection Indicator */}
        <Tooltip
          label={
            isDesktop
              ? "Terkoneksi ke Windows Native API (SendInput aktif)"
              : "Mode Browser - Jalankan desktop app untuk autoplay ke Roblox"
          }
          withArrow
        >
          <Badge
            variant="light"
            color={isDesktop ? "teal" : "yellow"}
            size="lg"
            radius="pill"
            leftSection={<Terminal size={13} />}
            style={{ textTransform: "none", fontWeight: 500 }}
          >
            {isDesktop ? "Windows Desktop Native" : "Mode Browser"}
          </Badge>
        </Tooltip>

        {/* Global Hotkeys Badge */}
        <Tooltip label="Tekan F6 di Roblox untuk Play/Pause, ESC untuk Berhenti" withArrow>
          <Badge
            variant="outline"
            color="gray"
            size="lg"
            radius="pill"
            style={{
              textTransform: "none",
              backgroundColor: "var(--surface-soft)",
              borderColor: "var(--hairline)",
              color: "var(--body)",
            }}
          >
            <Group gap={4}>
              <Kbd size="xs">F6</Kbd>
              <Text size="xs">Play/Pause</Text>
              <Text size="xs" c="dimmed">
                •
              </Text>
              <Kbd size="xs">ESC</Kbd>
              <Text size="xs">Stop</Text>
            </Group>
          </Badge>
        </Tooltip>

        {/* Audio Mute Switch Indicator */}
        <Tooltip
          label={
            isAudioMuted
              ? "Audio Aplikasi Muted (Roblox Safe - mencegah tabrakan suara)"
              : "Audio Aplikasi Menyala (Preview nada tuts aktif)"
          }
          withArrow
        >
          <Button
            variant={isAudioMuted ? "light" : "subtle"}
            color={isAudioMuted ? "teal" : "gray"}
            size="xs"
            radius="pill"
            onClick={onToggleAudioMute}
            leftSection={isAudioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          >
            {isAudioMuted ? "Audio: Muted (Roblox Safe)" : "Audio: On"}
          </Button>
        </Tooltip>

        {/* Quick Sync */}
        <Tooltip label="Sinkronkan lembar dari playpianosheets.com" withArrow>
          <Button
            variant="default"
            size="xs"
            radius="pill"
            onClick={onOpenSync}
            leftSection={<Globe size={14} />}
          >
            Sync URL
          </Button>
        </Tooltip>

        {/* Language Switcher (ID / EN) */}
        <Tooltip
          label={lang === "id" ? "Ganti ke Bahasa Inggris (Switch to English)" : "Switch to Indonesian (Ganti ke Bahasa Indonesia)"}
          withArrow
        >
          <Button
            variant="default"
            size="xs"
            radius="pill"
            onClick={toggleLang}
            leftSection={<Languages size={14} color="#cc785c" />}
            style={{ fontWeight: 700, fontSize: "11px", height: "30px", padding: "0 10px" }}
          >
            {lang === "id" ? "🇮🇩 ID" : "🇬🇧 EN"}
          </Button>
        </Tooltip>

        {/* Dark / Light Mode Toggle */}
        <Tooltip label={isDark ? "Ganti ke Mode Terang (Cream)" : "Ganti ke Mode Gelap (Obsidian)"} withArrow>
          <ActionIcon
            variant="default"
            size="md"
            radius="pill"
            onClick={() => setColorScheme(isDark ? "light" : "dark")}
            aria-label="Toggle color scheme"
          >
            {isDark ? <Sun size={15} color="#e8a55a" /> : <Moon size={15} color="#6c6a64" />}
          </ActionIcon>
        </Tooltip>

        {/* Membership Badge */}
        <Badge
          variant="filled"
          color="coral"
          size="lg"
          radius="pill"
          leftSection={<Sparkles size={14} />}
          style={{ textTransform: "none", fontWeight: 600 }}
        >
          Open Source Edition
        </Badge>
      </Group>
    </Box>
  );
};
