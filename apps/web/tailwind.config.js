const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [path.join(__dirname, 'src/**/*.{ts,html}')],
  theme: {
    extend: {},
  },
  plugins: [],
};
