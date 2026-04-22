/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Nike-inspired palette
        primary: '#111111',
        primaryDark: '#000000',
        primaryLight: '#28282A',
        secondary: '#1151FF',
        accent: '#111111',
        background: '#FFFFFF',
        surface: '#F5F5F5',
        surfaceAlt: '#FAFAFA',
        card: '#FFFFFF',
        cardHover: '#E5E5E5',
        text: '#111111',
        textSecondary: '#707072',
        textMuted: '#9E9EA0',
        border: '#CACACB',
        borderActive: '#111111',
        success: '#007D48',
        warning: '#FCA600',
        error: '#D30005',
        info: '#1151FF',
        // Dark context
        darkBg: '#111111',
        darkSurface: '#1F1F21',
        darkSurfaceAlt: '#28282A',
        darkCard: '#39393B',
        darkText: '#FFFFFF',
        darkTextSecondary: '#CACACB',
        darkTextMuted: '#9E9EA0',
      },
      borderRadius: {
        'xs': '8px',
        'md': '18px',
        'lg': '20px',
        'search': '24px',
        'pill': '30px',
      },
    },
  },
  presets: [require("nativewind/preset")],
  plugins: [],
}
