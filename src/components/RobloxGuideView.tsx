import React from "react";
import { Terminal, CheckCircle2, AlertTriangle } from "lucide-react";
import { useTranslation } from "../i18n";
import {
  Box,
  Paper,
  Title,
  Text,
  Badge,
  SimpleGrid,
  List,
  ThemeIcon,
  Code,
  Group,
  Alert,
} from "@mantine/core";

export const RobloxGuideView: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box p="lg" style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Banner */}
      <Paper p="xl" radius="lg" withBorder mb="lg" style={{ backgroundColor: "var(--surface-card)" }}>
        <Group align="flex-start" gap="md">
          <ThemeIcon color="coral" variant="light" size="xl" radius="md">
            <Terminal size={24} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Title order={3} fw={700} mb={4}>
              {t("guide.bannerTitle")}
            </Title>
            <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
              {t("guide.bannerDesc")}
            </Text>
          </Box>
        </Group>
      </Paper>

      {/* Steps Grid */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Paper p="lg" radius="lg" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
          <Badge color="coral" variant="filled" size="sm" mb="xs">
            {t("guide.stepBadge", { num: 1 })}
          </Badge>
          <Title order={4} fw={700} mb="xs">
            {t("guide.step1Title")}
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            {t("guide.step1Desc")}
          </Text>
          <Code block>npm run desktop</Code>
        </Paper>

        <Paper p="lg" radius="lg" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
          <Badge color="coral" variant="filled" size="sm" mb="xs">
            {t("guide.stepBadge", { num: 2 })}
          </Badge>
          <Title order={4} fw={700} mb="xs">
            {t("guide.step2Title")}
          </Title>
          <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
            {t("guide.step2Desc")}
          </Text>
        </Paper>

        <Paper p="lg" radius="lg" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
          <Badge color="coral" variant="filled" size="sm" mb="xs">
            {t("guide.stepBadge", { num: 3 })}
          </Badge>
          <Title order={4} fw={700} mb="xs">
            {t("guide.step3Title")}
          </Title>
          <List
            spacing="xs"
            size="xs"
            center
            icon={
              <ThemeIcon color="teal" size={16} radius="xl" variant="light">
                <CheckCircle2 size={11} strokeWidth={2.5} />
              </ThemeIcon>
            }
          >
            <List.Item>
              <strong>{t("guide.step3Item1")}</strong>
            </List.Item>
            <List.Item>
              <strong>{t("guide.step3Item2")}</strong>
            </List.Item>
            <List.Item>
              <strong>{t("guide.step3Item3")}</strong>
            </List.Item>
          </List>
        </Paper>

        <Paper p="lg" radius="lg" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
          <Badge color="coral" variant="filled" size="sm" mb="xs">
            {t("guide.stepBadge", { num: 4 })}
          </Badge>
          <Title order={4} fw={700} mb="xs">
            {t("guide.step4Title")}
          </Title>
          <Text size="xs" c="dimmed" mb="xs" style={{ lineHeight: 1.6 }}>
            {t("guide.step4Desc")}
          </Text>
          <Group gap="xs" mb="xs">
            <Badge size="lg" color="coral" variant="filled">
              F6
            </Badge>
            <Text size="xs" fw={500}>
              {t("guide.f6Desc")}
            </Text>
          </Group>
          <Group gap="xs">
            <Badge size="lg" color="red" variant="filled">
              ESC
            </Badge>
            <Text size="xs" fw={500}>
              {t("guide.escDesc")}
            </Text>
          </Group>
        </Paper>
      </SimpleGrid>

      <Alert
        icon={<AlertTriangle size={18} />}
        color="orange"
        variant="light"
        radius="lg"
        mt="lg"
        title={t("guide.doubleSoundTipTitle")}
      >
        {t("guide.doubleSoundTipDesc")}
      </Alert>
    </Box>
  );
};
