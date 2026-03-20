/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: { DEFAULT: "hsl(var(--background))" },
        foreground: { DEFAULT: "hsl(var(--foreground))" },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: { DEFAULT: "hsl(var(--border))" },
        input: { DEFAULT: "hsl(var(--input))" },
        ring: { DEFAULT: "hsl(var(--ring))" },

        "sidebar-background": { DEFAULT: "hsl(var(--sidebar-background))" },
        "sidebar-foreground": { DEFAULT: "hsl(var(--sidebar-foreground))" },
        "sidebar-primary": { DEFAULT: "hsl(var(--sidebar-primary))" },
        "sidebar-primary-foreground": {
          DEFAULT: "hsl(var(--sidebar-primary-foreground))",
        },
        "sidebar-accent": { DEFAULT: "hsl(var(--sidebar-accent))" },
        "sidebar-accent-foreground": {
          DEFAULT: "hsl(var(--sidebar-accent-foreground))",
        },
        "sidebar-border": { DEFAULT: "hsl(var(--sidebar-border))" },
        "sidebar-ring": { DEFAULT: "hsl(var(--sidebar-ring))" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

