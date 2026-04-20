/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B35',
        primaryDark: '#D85A2E',
        primaryLight: '#FF9068',
        secondary: '#FFA94D',
        accent: '#2EC4B6',
        background: '#0E0E11',
        surface: '#17171C',
        surfaceAlt: '#22222A',
        card: '#1C1C22',
        text: '#FFFFFF',
        textSecondary: '#B3B3B8',
        textMuted: '#6B6B73',
        border: '#2A2A32',
        success: '#4ADE80',
        warning: '#FFB84D',
        error: '#FF6B6B',
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
