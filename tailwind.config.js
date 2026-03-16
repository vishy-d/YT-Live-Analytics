/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#030a1a',
        surface: '#0a1628',
        glass:   'rgba(10,22,40,0.6)',
        border:  'rgba(0,212,255,0.12)',
        red:     '#ff2d55',
        cyan:    '#00d4ff',
        violet:  '#8b5cf6',
        green:   '#10ff9a',
        amber:   '#ffb700',
        muted:   '#4a6080',
        subtle:  '#1e3a5f',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
        number:  ['Bebas Neue', 'cursive'],
      },
      boxShadow: {
        'glow-red':    '0 0 30px rgba(255,45,85,0.3)',
        'glow-cyan':   '0 0 30px rgba(0,212,255,0.25)',
        'glow-violet': '0 0 20px rgba(139,92,246,0.3)',
        'glow-green':  '0 0 20px rgba(16,255,154,0.25)',
      },
      backgroundImage: {
        'grid': "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
        'radial-glow': 'radial-gradient(ellipse at center, rgba(0,212,255,0.06) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-red':   'pulseRed 2s ease-in-out infinite',
        'pulse-cyan':  'pulseCyan 2s ease-in-out infinite',
        'scan':        'scan 3s linear infinite',
        'float':       'float 6s ease-in-out infinite',
        'count-in':    'countIn 0.4s ease-out',
        'slide-up':    'slideUp 0.5s ease-out',
        'slide-right': 'slideRight 0.4s ease-out',
        'glow-pulse':  'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        pulseRed:  { '0%,100%': { opacity: 1, boxShadow: '0 0 8px #ff2d55' }, '50%': { opacity: 0.4, boxShadow: '0 0 20px #ff2d55' }},
        pulseCyan: { '0%,100%': { opacity: 1, boxShadow: '0 0 8px #00d4ff' }, '50%': { opacity: 0.4, boxShadow: '0 0 20px #00d4ff' }},
        scan:      { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100vh)' }},
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' }},
        countIn:   { from: { opacity: 0, transform: 'scale(0.8)' }, to: { opacity: 1, transform: 'scale(1)' }},
        slideUp:   { from: { opacity: 0, transform: 'translateY(24px)' }, to: { opacity: 1, transform: 'translateY(0)' }},
        slideRight:{ from: { opacity: 0, transform: 'translateX(-20px)' }, to: { opacity: 1, transform: 'translateX(0)' }},
        glowPulse: { '0%,100%': { boxShadow: '0 0 8px rgba(0,212,255,0.3)' }, '50%': { boxShadow: '0 0 24px rgba(0,212,255,0.7)' }},
      },
    },
  },
  plugins: [],
}
