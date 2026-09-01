/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Brand — SaaS Vibrant Blue #3361FF
        brand: {
          950: '#101E50',
          900: '#172E8A',
          800: '#1E3EB8',
          700: '#254EDB',
          600: '#3361FF',
          500: '#3361FF',
          400: '#5C82FF',
          300: '#8FA8FF',
          200: '#C2D1FF',
          100: '#E0E7FF',
          50:  '#F1F4FF',
          DEFAULT: '#3361FF',
        },
        // Soft Matte Dark Neutral Palette (#262B35)
        dark: {
          DEFAULT: '#262B35',
          900: '#262B35',
          800: '#333945',
          700: '#444C5C',
          600: '#5A6376',
          500: '#747E93',
          400: '#98A2B3',
          300: '#D0D5DD',
          200: '#EDEFF2',
          100: '#F1F4FF',
          50:  '#FFFFFF',
        },
        // Semantic Colors from Design Spec
        success: {
          DEFAULT: '#29CC6A',
          light: '#EAFBF1',
          border: '#A3F2C3',
          text: '#169E4E',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FFFBEB',
          border: '#FDE68A',
          text: '#B45309',
          orange: '#D97706',
        },
        danger: {
          DEFAULT: '#FC5555',
          light: '#FFF0F0',
          border: '#FFC2C2',
          text: '#DC2626',
        },
        info: {
          DEFAULT: '#3361FF',
          light: '#F1F4FF',
          border: '#C2D1FF',
          text: '#254EDB',
        },
        // Surface & Canvas
        canvas:  '#F1F4FF',
        surface: '#FFFFFF',
        neutralLight: '#EDEFF2',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        inter: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Typography Hierarchy Guide (Poppins)
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '0px', fontWeight: '700' }],
        'headline-md': ['28px', { lineHeight: '36px', letterSpacing: '0px', fontWeight: '400' }],
        'headline-sm': ['24px', { lineHeight: '32px', letterSpacing: '0px', fontWeight: '400' }],
        'title-xl':    ['22px', { lineHeight: '28px', letterSpacing: '0px', fontWeight: '600' }],
        'title-lg':    ['20px', { lineHeight: '26px', letterSpacing: '0px', fontWeight: '600' }],
        'title-md':    ['18px', { lineHeight: '20px', letterSpacing: '0.15px', fontWeight: '400' }],
        'title-sm':    ['16px', { lineHeight: '24px', letterSpacing: '0.15px', fontWeight: '500' }],
        'title-xs':    ['14px', { lineHeight: '20px', letterSpacing: '0.1px', fontWeight: '500' }],
        'label-lg':    ['14px', { lineHeight: '20px', letterSpacing: '0.1px', fontWeight: '500' }],
        'label-md':    ['12px', { lineHeight: '18px', letterSpacing: '0.5px', fontWeight: '600' }],
        'label-sm':    ['11px', { lineHeight: '16px', letterSpacing: '0.5px', fontWeight: '500' }],
        'label-xs':    ['10px', { lineHeight: '12px', letterSpacing: '0.5px', fontWeight: '400' }],
      },
      boxShadow: {
        'subtle':  '0 1px 3px 0 rgba(31,31,31,0.05), 0 1px 2px -1px rgba(31,31,31,0.03)',
        'card':    '0 4px 16px -2px rgba(51,97,255,0.06), 0 2px 4px -2px rgba(31,31,31,0.03)',
        'float':   '0 12px 24px -4px rgba(51,97,255,0.12), 0 4px 8px -4px rgba(51,97,255,0.06)',
        'hero':    '0 20px 40px -8px rgba(31,31,31,0.30), 0 8px 16px -4px rgba(51,97,255,0.15)',
        'brand':   '0 4px 14px 0 rgba(51,97,255,0.25)',
        'inner-sm':'inset 0 1px 2px 0 rgba(0,0,0,0.05)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '72': '18rem',
        '80': '20rem',
        '88': '22rem',
      },
      width: {
        '18': '4.5rem',
        '56': '14rem',
        '72': '18rem',
      },
      minWidth: {
        '18': '4.5rem',
        '56': '14rem',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      animation: {
        'fade-in':        'fadeIn 0.25s ease-out forwards',
        'fade-in-up':     'fadeInUp 0.30s ease-out forwards',
        'slide-in-left':  'slideInLeft 0.25s ease-out forwards',
        'scale-in':       'scaleIn 0.20s ease-out forwards',
        'pulse-slow':     'pulse 3s ease-in-out infinite',
        'count-up':       'fadeInUp 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to':   { opacity: '1' },
        },
        fadeInUp: {
          'from': { opacity: '0', transform: 'translateY(8px)' },
          'to':   { opacity: '1', transform: 'none' },
        },
        slideInLeft: {
          'from': { opacity: '0', transform: 'translateX(-12px)' },
          'to':   { opacity: '1', transform: 'none' },
        },
        scaleIn: {
          'from': { opacity: '0', transform: 'scale(0.95)' },
          'to':   { opacity: '1', transform: 'none' },
        },
      },
      backgroundImage: {
        'hero-gradient':   'linear-gradient(135deg, #1F1F1F 0%, #172E8A 55%, #3361FF 100%)',
        'brand-gradient':  'linear-gradient(135deg, #254EDB 0%, #3361FF 100%)',
        'hero-shimmer':    'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)',
        'card-gradient':   'linear-gradient(135deg, #FFFFFF 0%, #F1F4FF 100%)',
      },
    },
  },
  plugins: [],
}
