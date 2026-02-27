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
        Outfit: ["Outfit", "sans-serif"],
      },
      keyframes: {
        slideIn: {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        bounceIn: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        sidebarSlideIn: {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        activePulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        expandDown: {
          from: { opacity: "0", maxHeight: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", maxHeight: "500px", transform: "translateY(0)" },
        },
        overlayFade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.9) translateY(4px)" },
          "60%": { transform: "scale(1.02) translateY(-1px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        slideDown: "slideDown 0.3s ease-out",
        slideUp: "slideUp 0.3s ease-out",
        fadeIn: "fadeIn 0.5s ease-out forwards",
        slideIn: "slideIn 0.4s ease-out forwards",
        bounceIn: "bounceIn 0.6s ease-out forwards",
        sidebarSlideIn: "sidebarSlideIn 0.3s ease-out forwards",
        activePulse: "activePulse 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        expandDown: "expandDown 0.3s ease-out forwards",
        overlayFade: "overlayFade 0.2s ease-out forwards",
        popIn: "popIn 0.35s ease-out forwards",
      },
      animationDelay: {
        100: "0.1s",
        200: "0.2s",
        300: "0.3s",
      },
    },
  },
  plugins: [],
};
