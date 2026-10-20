export const themes = {
  emerald: {
    label: "Emerald Matrix",
    shortLabel: "Emerald",
    accent: "#10B981",
    secondary: "#8CBEB1",
  },
  pink: {
    label: "Cyberpunk Pink",
    shortLabel: "Pink",
    accent: "#FF007F",
    secondary: "#BA92B9",
  },
  cyan: {
    label: "Electric Cyan",
    shortLabel: "Cyan",
    accent: "#00F0FF",
    secondary: "#7EABCA",
  },
} as const;

export type ThemeName = keyof typeof themes;
export type MapTheme = { accent: string; secondary: string };
