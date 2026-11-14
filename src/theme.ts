import { createTheme, MantineColorsTuple } from "@mantine/core";

// 10-shade Claude Terracotta Coral palette (#cc785c)
const coral: MantineColorsTuple = [
  "#faf2ee", // 0
  "#f4e3dc", // 1
  "#ebd1c5", // 2
  "#dfb4a4", // 3
  "#d3937f", // 4
  "#cc785c", // 5 - Primary brand
  "#b86449", // 6 - Active shade
  "#9e523a", // 7
  "#85442e", // 8
  "#6b3523", // 9
];

// Warm tinted cream / linen palette
const cream: MantineColorsTuple = [
  "#faf9f5", // 0 - Canvas
  "#f5f0e8", // 1 - Surface soft
  "#efe9de", // 2 - Surface card
  "#e8e0d2", // 3 - Strong cream border
  "#e0d5c4", // 4
  "#d4c6b2", // 5
  "#b8a791", // 6
  "#94846f", // 7
  "#6e6252", // 8
  "#423a2f", // 9
];

// Dark obsidian piano enamel with high-contrast elevated cards
const dark: MantineColorsTuple = [
  "#c5c2ba", // 0
  "#9e9a91", // 1
  "#78746c", // 2
  "#58544d", // 3
  "#38342c", // 4 - borders
  "#2c2822", // 5 - hover
  "#22201b", // 6 - Elevated card surface (clearly separated from body canvas)
  "#181714", // 7 - Soft dark
  "#141310", // 8 - Surface dark
  "#100f0d", // 9 - Deep canvas
];

export const theme = createTheme({
  primaryColor: "coral",
  primaryShade: { light: 5, dark: 4 },
  colors: {
    coral,
    cream,
    dark,
  },
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  headings: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: "700",
  },
  defaultRadius: "md",
  cursorType: "pointer",
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
        leftSectionPointerEvents: "none",
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: "md",
        leftSectionPointerEvents: "none",
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
        centered: true,
        transitionProps: { transition: "fade-down", duration: 200 },
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        shadow: "xs",
      },
    },
    Paper: {
      defaultProps: {
        radius: "md",
        shadow: "none",
      },
    },
    Badge: {
      defaultProps: {
        radius: "sm",
      },
    },
  },
});

