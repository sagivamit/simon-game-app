/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Epic 11: Neon color palette
        neon: {
          green: '#00ff41',
          red: '#ff0040',
          yellow: '#ffeb00',
          blue: '#00d9ff',
        },
        dark: {
          bg: '#000000',
          surface: '#0a0a0a',
          card: '#1a1a1a',
        },
      },
      boxShadow: {
        // Epic 11: Neon glow effects
        'neon-green': '0 0 20px #00ff41, 0 0 40px #00ff41, 0 0 60px #00ff41',
        'neon-red': '0 0 20px #ff0040, 0 0 40px #ff0040, 0 0 60px #ff0040',
        'neon-yellow': '0 0 20px #ffeb00, 0 0 40px #ffeb00, 0 0 60px #ffeb00',
        'neon-blue': '0 0 20px #00d9ff, 0 0 40px #00d9ff, 0 0 60px #00d9ff',
        'neon-glow': '0 0 30px currentColor, 0 0 60px currentColor',
      },
    },
  },
  plugins: [],
}
