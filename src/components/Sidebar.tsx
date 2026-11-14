import React from "react";
import {
  Music,
  BookOpen,
  UploadCloud,
  Globe,
  UserCheck,
  HelpCircle,
  LogOut,
  LogIn,
  ShieldCheck,
  Sun,
  Moon,
} from "lucide-react";
import { UserProfile } from "../lib/types";
import { useTranslation } from "../i18n";
import {
  Box,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Avatar,
  ActionIcon,
  Tooltip,
  Divider,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";

export type NavView =
  | "player"
  | "library"
  | "upload"
  | "profile"
  | "guide";

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSync: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  user,
  onOpenAuth,
  onLogout,
  onOpenSync,
}) => {
  const { t } = useTranslation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const navItems: Array<{
    id: NavView;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    { id: "player", label: t("sidebar.player"), icon: <Music size={17} /> },
    { id: "library", label: t("sidebar.library"), icon: <BookOpen size={17} /> },
    { id: "upload", label: t("sidebar.upload"), icon: <UploadCloud size={17} /> },
    {
      id: "profile",
      label: t("sidebar.profile"),
      icon: <UserCheck size={17} />,
      badge: user?.mfaEnabled ? "MFA" : undefined,
    },
    { id: "guide", label: t("sidebar.guide"), icon: <HelpCircle size={17} /> },
  ];

  return (
    <Box
      component="aside"
      style={{
        width: 250,
        height: "100vh",
        backgroundColor: "var(--canvas)",
        borderRight: "1px solid var(--hairline)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <Box p="md" pb="sm">
        <Group gap="sm" wrap="nowrap">
          <Box
            style={{
              width: 38,
              height: 38,
              borderRadius: "10px",
              backgroundColor: "var(--surface-dark)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              border: "1px solid rgba(204, 120, 92, 0.3)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <img
              src="/app-logo.png"
              alt="Auto Piano Play Logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} size="sm" c="var(--ink)" style={{ lineHeight: 1.2 }}>
              Auto Piano Play
            </Text>
            <Box mt={3}>
              <Badge size="xs" variant="filled" color="coral">
                OPEN SOURCE
              </Badge>
            </Box>
          </Box>
        </Group>
      </Box>

      {/* Quick Sync Button */}
      <Box px="md" pb="sm">
        <Button
          variant="light"
          color="gray"
          fullWidth
          size="xs"
          radius="md"
          leftSection={<Globe size={15} />}
          onClick={onOpenSync}
          styles={{
            root: {
              backgroundColor: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              color: "var(--ink)",
              fontWeight: 500,
            },
          }}
        >
          {t("sidebar.syncButton")}
        </Button>
      </Box>

      <Divider color="var(--hairline)" />

      {/* Navigation Links */}
      <Box px="xs" py="sm" style={{ flex: 1, overflowY: "auto" }}>
        <Text
          size="xs"
          fw={700}
          c="dimmed"
          px="xs"
          mb="xs"
          style={{ letterSpacing: "0.05em" }}
        >
          {t("sidebar.mainMenu")}
        </Text>
        <Stack gap={3}>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <UnstyledButton
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  backgroundColor: isActive
                    ? "var(--surface-card)"
                    : "transparent",
                  border: isActive
                    ? "1px solid var(--hairline)"
                    : "1px solid transparent",
                  boxShadow: "none",
                  color: isActive ? "var(--primary)" : "var(--body)",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "13.5px",
                  transition: "all 0.15s ease",
                }}
              >
                <Group gap="sm">
                  <Box
                    style={{
                      color: isActive ? "var(--primary)" : "var(--muted)",
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Text size="sm" fw={isActive ? 600 : 500} style={{ fontWeight: isActive ? 600 : 500 }}>
                    {item.label}
                  </Text>
                </Group>
                {item.badge && (
                  <Badge
                    size="xs"
                    variant={
                      item.badge === "FULL"
                        ? "filled"
                        : item.badge === "PRO"
                          ? "filled"
                          : "light"
                    }
                    color={
                      item.badge === "FULL"
                        ? "dark"
                        : item.badge === "PRO"
                          ? "coral"
                          : item.badge === "MFA"
                            ? "teal"
                            : "gray"
                    }
                  >
                    {item.badge}
                  </Badge>
                )}
              </UnstyledButton>
            );
          })}
        </Stack>
      </Box>

      <Divider color="var(--hairline)" />

      {/* User Bottom Profile Section */}
      <Box p="sm">
        {user ? (
          <Group
            justify="space-between"
            wrap="nowrap"
            p="xs"
            style={{
              backgroundColor: "var(--surface-card)",
              borderRadius: "8px",
              border: "1px solid var(--hairline)",
            }}
          >
            <Group
              gap="xs"
              wrap="nowrap"
              style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
              onClick={() => onNavigate("profile")}
            >
              <Box style={{ position: "relative" }}>
                <Avatar
                  src={user.avatarUrl}
                  alt={user.name}
                  radius="xl"
                  size="sm"
                  color="coral"
                >
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              </Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Group gap={4} wrap="nowrap">
                  <Text size="xs" fw={600} truncate c="var(--ink)">
                    {user.name}
                  </Text>
                  {user.mfaEnabled && <ShieldCheck size={12} color="#5db872" />}
                </Group>
                <Text size="10px" c="dimmed" truncate>
                  {user.email}
                </Text>
              </Box>
            </Group>

            <Group gap={4}>
              <Tooltip label={isDark ? t("common.lightMode") : t("common.darkMode")} withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => setColorScheme(isDark ? "light" : "dark")}
                  aria-label="Toggle theme"
                >
                  {isDark ? <Sun size={15} color="#e8a55a" /> : <Moon size={15} />}
                </ActionIcon>
              </Tooltip>

              <Tooltip label={t("sidebar.logOut")} withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={onLogout}
                >
                  <LogOut size={15} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        ) : (
          <Stack gap="xs">
            <Button
              variant="filled"
              color="coral"
              fullWidth
              size="sm"
              leftSection={<LogIn size={16} />}
              onClick={onOpenAuth}
            >
              {t("sidebar.signInOrRegister")}
            </Button>
            <Button
              variant="subtle"
              color="gray"
              fullWidth
              size="xs"
              leftSection={isDark ? <Sun size={14} color="#e8a55a" /> : <Moon size={14} />}
              onClick={() => setColorScheme(isDark ? "light" : "dark")}
            >
              {isDark ? t("sidebar.switchThemeLight") : t("sidebar.switchThemeDark")}
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );
};
