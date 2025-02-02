/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // This enables class-based dark mode
  theme: {
    extend: {
      colors: {
        // Light mode colors
        light: {
          primary: '#ffffff',
          secondary: '#f3f4f6',
          text: '#111827',
          accent: '#3b82f6',
        },
        // Dark mode colors
        dark: {
          primary: '#1f2937',
          secondary: '#111827',
          text: '#f9fafb',
          accent: '#60a5fa',
        }
      }
    },
  },

  plugins: [],
}