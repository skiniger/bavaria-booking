/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bavaria-blue': '#3B82F6',
        'bavaria-green': '#10B981',
        'bavaria-red': '#EF4444',
        'bavaria-yellow': '#F59E0B',
      },
    },
  },
  plugins: [],
}
