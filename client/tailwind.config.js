/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // This enables class-based dark mode
  theme: {
    extend: {
      colors: {
        // Light mode colors
        light: {
          primary: "#ffffff",
          secondary: "#f3f4f6",
          text: "#111827",
          accent: "#3b82f6",
        },
        // Dark mode colors
        dark: {
          primary: "#1f2937",
          secondary: "#111827",
          text: "#f9fafb",
          accent: "#60a5fa",
        },
        //animation
        animation: {
          shimmer: "shimmer 2s infinite linear",
          pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          "bounce-slow": "bounce 2s infinite",
          "fade-in-up": "fadeInUp 0.6s ease-out forwards",
          "pulse-dot-1": "pulseDelay 1.5s infinite",
          "pulse-dot-2": "pulseDelay 1.5s infinite 0.2s",
          "pulse-dot-3": "pulseDelay 1.5s infinite 0.4s",
        },
        keyframes: {
          shimmer: {
            "0%": {
              backgroundPosition: "-1000px 0",
            },
            "100%": {
              backgroundPosition: "1000px 0",
            },
          },
          pulse: {
            "0%, 100%": {
              opacity: 1,
            },
            "50%": {
              opacity: 0.5,
            },
          },
          fadeInUp: {
            '0%': {
              opacity: '0',
              transform: 'translateY(20px)'
            },
            '100%': {
              opacity: '1',
              transform: 'translateY(0)'
            }
          },
          pulseDelay: {
            '0%, 100%': {
              opacity: '0.2',
              transform: 'scale(1)'
            },
            '50%': {
              opacity: '1',
              transform: 'scale(1.3)'
            }
          }
  
        },
      },
    },
  },

  plugins: [

    function({ addUtilities }) {
      const newUtilities = {
        '.animation-delay-200': {
          'animation-delay': '200ms',
        },
        '.animation-delay-400': {
          'animation-delay': '400ms',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
