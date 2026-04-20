/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#6C63FF',
        primaryDark: '#4B44CC',
        secondary: '#FF6584',
        accent: '#43E97B',
        background: '#0F0F1A',
        surface: '#1A1A2E',
        card: '#1E1E3A',
        text: '#FFFFFF',
        textSecondary: '#A0A0C0',
      },
      fontFamily: {
        // can add custom fonts here later
      }
    },
  },
  presets: [require("nativewind/preset")],
  nativewind: true,
  plugins: [],
}
