/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F5F5F7",
        components: "#FFFFFF",
        button: "#3B693B",
        buttonHover: "#335C33",
        stroke: "#79827F",
        title: "#333333",
        subtext: "#5C5C5C",
        subsubtext: "#7A7A7A",
        accent: "#1D9F1D",
        accentHover: "#178717",
      },
      fontFamily: {
        Outfit: "Outfit",
      },
      keyframes: {
        slideDown: {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        slideDown: "slideDown 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
