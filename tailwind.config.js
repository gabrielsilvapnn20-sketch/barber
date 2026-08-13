/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cor de CTA / destaque — vermelho/bordô da marca (botões "Pedir agora",
        // preços, status). É o `brand` para que .btn-primary já saia vermelho.
        brand: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f2555f',
          500: '#d1202f',
          600: '#b41626',
          700: '#951320',
          800: '#7a141f',
          900: '#66151e',
        },
        // Cor base da marca — amarelo (apetite/urgência, fundo da logo).
        sun: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f5a800',
          600: '#d98e00',
          700: '#b4700a',
          800: '#924f0f',
          900: '#78400f',
        },
        // Cor de apoio/contraste — azul (ícones, elementos neutros).
        azure: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '60%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'cart-bump': {
          '0%,100%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.25)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'pop': 'pop 0.28s ease-out',
        'cart-bump': 'cart-bump 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
