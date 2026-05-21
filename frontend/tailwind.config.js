/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode by default/manually via class
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        crm: {
          dark: '#0f172a',      // slate-900 (Main BG)
          darker: '#020617',    // slate-950
          card: '#1e293b',      // slate-800 (Card BG)
          primary: '#6366f1',   // indigo-500
          primaryHover: '#4f46e5', // indigo-600
          accent: '#8b5cf6',    // violet-500
          border: '#334155',    // slate-700
          text: '#f8fafc',      // slate-50
          textMuted: '#94a3b8', // slate-400
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(to right bottom, #0f172a, #1e293b, #0f172a)',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
      }
    },
  },
  plugins: [],
}
