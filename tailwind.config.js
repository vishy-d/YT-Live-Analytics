/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0d0f14',
        surface: '#111318',
        border:  'rgba(255,255,255,0.07)',
        blue:    '#0a84ff',
        red:     '#ff453a',
        green:   '#30d158',
        amber:   '#ffd60a',
        teal:    '#00c7be',
        violet:  '#bf5af2',
        muted:   '#6b7585',
      },
      fontFamily: {
        display: ['"IBM Plex Sans"', 'sans-serif'],
        body:    ['"IBM Plex Sans"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
        number:  ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-blue':  '0 0 20px rgba(10,132,255,0.25)',
        'glow-green': '0 0 20px rgba(48,209,88,0.20)',
        'glow-red':   '0 0 20px rgba(255,69,58,0.25)',
      },
    },
  },
  plugins: [],
}
