/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./lib/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        paper: "#f3eee4",
        "paper-2": "#e9e1d2",
        ink: "#1c1612",
        "ink-soft": "#5c534a",
        line: "#d7cfc2",
        card: "#fffaf2",
        accent: "#9a3412",
        "accent-2": "#c2410c",
        forest: "#3f6212",
        rose: "#9f1239",
      },
      fontFamily: {
        sans: ["Figtree_400Regular"],
        "sans-medium": ["Figtree_500Medium"],
        "sans-semibold": ["Figtree_600SemiBold"],
        serif: ["Fraunces_600SemiBold"],
      },
    },
  },
  plugins: [],
};
