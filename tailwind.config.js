/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./views/**/*.ejs"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        // Minimal Luxury Palette
        primary: {
          DEFAULT: '#020617', // Slate 950 - Strong Headings / Main Text
          light: '#334155',   // Slate 700
          dark: '#000000',    // Pure Black
        },
        secondary: {
          DEFAULT: '#475569', // Slate 600 - Body Text / Descriptions
          light: '#94A3B8',   // Slate 400
          dark: '#1E293B',    // Slate 800
        },
        accent: {
          DEFAULT: '#2563EB', // Blue 600 - Professional/Trust
          hover: '#1D4ED8',   // Blue 700
          light: '#E0F2FE',   // Blue 50 - Subtle Backgrounds
        },
        surface: {
          DEFAULT: '#FFFFFF', // Pure White - Cards / Sections
          alt: '#F8FAFC',     // Slate 50 - Page Backgrounds / Alternating Sections
          muted: '#F1F5F9',   // Slate 100 - Borders / Dividers
        },
        border: {
          DEFAULT: '#E2E8F0', // Slate 200 - Default Borders
          light: '#F1F5F9',   // Slate 100
          dark: '#CBD5E1',    // Slate 300
        },
        success: {
          DEFAULT: '#16A34A', // Green 600
          bg: '#DCFCE7',      // Green 50
        },
        danger: {
          DEFAULT: '#DC2626', // Red 600
          bg: '#FEE2E2',      // Red 50
        },
        warning: {
          DEFAULT: '#D97706', // Amber 600
          bg: '#FEF3C7',      // Amber 50
        },
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.02)', // Subtle lift
        'card': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.02)', // Card hover
        'dropdown': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', // Dropdowns/Modals
        'inner-light': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
};