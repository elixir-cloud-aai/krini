/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
      extend: {
        fontFamily: {
            mons: ['Montserrat', 'sans-serif'],
            open: ['Open Sans', 'sans-serif']
        },
        colors: {
            color1: '#E8F9FD',
            color2: '#79DAE8',
            color3: '#0AA1DD',
            color4: '#2155CD'
        },
      },
    },
    plugins: [],
    darkMode: 'class'
  };