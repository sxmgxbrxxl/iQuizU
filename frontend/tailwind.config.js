/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#EFEFEF",
        components: "#FFFFFF",
        button: "#D9D9D9",
        stroke: "#9F9B9B",
        subtext: "#5C5C5C",
      },
      fontFamily: {
        Outfit: "Outfit",
      },
    },
  },
  plugins: [],
};
