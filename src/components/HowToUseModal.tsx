import React from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Modal,
  Box,
  Text,
  Title,
  Button,
  Group,
  Stack,
  Badge,
  Paper,
  ThemeIcon,
  Kbd,
} from "@mantine/core";

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToUseModal: React.FC<HowToUseModalProps> = ({ isOpen, onClose }) => {
  const handleOpenPlayPianoSheets = async () => {
    const url = "https://playpianosheets.com/sheets/golden-hour";
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  };

  const modalTitle = (
    <Group gap="xs">
      <ThemeIcon color="coral" variant="light" size="lg" radius="md">
        <BookOpen size={18} />
      </ThemeIcon>
      <Box>
        <Title order={4} fw={700}>
          Panduan Bermain di Virtual Piano & Roblox
        </Title>
        <Text size="xs" c="dimmed">
          Cara menggunakan Auto Piano Play untuk memainkan tuts piano virtual secara otomatis
        </Text>
      </Box>
    </Group>
  );

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      padding="lg"
      styles={{
        content: {
          backgroundColor: "var(--canvas)",
          border: "1px solid var(--hairline)",
        },
      }}
    >
      <Stack gap="md" mt="xs">
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
          <Group align="flex-start" gap="sm">
            <Badge color="coral" variant="filled" size="sm">
              1
            </Badge>
            <Box style={{ flex: 1 }}>
              <Text fw={600} size="sm">
                Buka Website Virtual Piano atau Roblox
              </Text>
              <Text size="xs" c="dimmed" mt={2} mb="xs">
                Buka halaman partitur di browser, misalnya lagu <strong>Golden Hour</strong> di PlayPianoSheets:
              </Text>
              <Button
                variant="light"
                color="coral"
                size="xs"
                leftSection={<ExternalLink size={13} />}
                onClick={handleOpenPlayPianoSheets}
              >
                Buka playpianosheets.com/sheets/golden-hour
              </Button>
            </Box>
          </Group>
        </Paper>

        <Paper p="md" radius="md" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
          <Group align="flex-start" gap="sm">
            <Badge color="coral" variant="filled" size="sm">
              2
            </Badge>
            <Box style={{ flex: 1 }}>
              <Text fw={600} size="sm">
                Pilih Lagu di Auto Piano Play
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                Pilih lagu yang sama dari Library Lagu atau gunakan fitur <strong>Sync URL</strong> untuk mengimpor notasi secara langsung.
              </Text>
            </Box>
          </Group>
        </Paper>

        <Paper p="md" radius="md" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
          <Group align="flex-start" gap="sm">
            <Badge color="coral" variant="filled" size="sm">
              3
            </Badge>
            <Box style={{ flex: 1 }}>
              <Text fw={600} size="sm">
                Fokuskan Kursor ke Piano Virtual
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                Klik tuts piano di website atau duduklah di kursi piano Roblox. Pastikan CapsLock <strong>MATI</strong> dan chat Roblox tertutup.
              </Text>
            </Box>
          </Group>
        </Paper>

        <Paper p="md" radius="md" withBorder style={{ backgroundColor: "var(--surface-card)" }}>
          <Group align="flex-start" gap="sm">
            <Badge color="coral" variant="filled" size="sm">
              4
            </Badge>
            <Box style={{ flex: 1 }}>
              <Text fw={600} size="sm">
                Tekan Global Hotkey F6
              </Text>
              <Text size="xs" c="dimmed" mt={2} mb="xs">
                Auto Piano Play akan segera mengetikkan tuts dengan timing akurat sesuai tempo lagu.
              </Text>
              <Group gap={6}>
                <Kbd size="xs">F6</Kbd>
                <Text size="xs" c="dimmed">
                  = Play / Pause
                </Text>
                <Text size="xs" c="dimmed">
                  •
                </Text>
                <Kbd size="xs">ESC</Kbd>
                <Text size="xs" c="dimmed">
                  = Emergency Stop
                </Text>
              </Group>
            </Box>
          </Group>
        </Paper>

        <Group justify="flex-end" mt="xs">
          <Button color="coral" onClick={onClose}>
            Mengerti & Tutup
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
