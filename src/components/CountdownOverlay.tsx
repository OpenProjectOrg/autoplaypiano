import React from "react";
import { Sparkles, Square } from "lucide-react";
import { Box, Paper, Title, Text, Badge, Button, Stack } from "@mantine/core";

interface CountdownOverlayProps {
  remainingSec: number;
  songTitle: string;
  onCancel: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  remainingSec,
  songTitle,
  onCancel,
}) => {
  return (
    <Box
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(20, 19, 17, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <Paper
        p="xl"
        radius="lg"
        withBorder
        style={{
          backgroundColor: "var(--canvas)",
          borderColor: "var(--primary)",
          maxWidth: 420,
          textAlign: "center",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.35)",
        }}
      >
        <Stack align="center" gap="sm">
          <Badge color="coral" variant="light" size="sm" leftSection={<Sparkles size={12} />}>
            PERSIAPAN PENGETIKAN OTOMATIS
          </Badge>

          <Title order={3} fw={700} lineClamp={1}>
            {songTitle}
          </Title>

          <Box
            my="sm"
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: "var(--surface-dark)",
              border: "2px solid var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(204, 120, 92, 0.35)",
            }}
          >
            <Text
              size="28px"
              fw={900}
              c="coral.5"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {remainingSec > 0 ? remainingSec : "GO!"}
            </Text>
          </Box>

          <Text size="xs" fw={500} c="var(--ink)">
            Segera fokuskan jendela ke piano Roblox atau browser Anda!
          </Text>
          <Text size="11px" c="dimmed">
            (Pastikan jendela aktif sebelum hitungan mundur selesai)
          </Text>

          <Button
            color="red"
            variant="light"
            size="xs"
            mt="xs"
            leftSection={<Square size={13} fill="currentColor" />}
            onClick={onCancel}
          >
            Batalkan (ESC)
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
