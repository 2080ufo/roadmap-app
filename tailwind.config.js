/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: { 900: '#0f1117', 800: '#161921', 700: '#1e2028', 600: '#2a2d35' },
        accent: { blue: '#3b82f6', green: '#22c55e', amber: '#f59e0b' },
        text: { primary: '#e4e4e7', secondary: '#a1a1aa', muted: '#71717a' }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
