import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'selector',
  content: [
    "./node_modules/flowbite/**/*.js",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    // "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    // "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // extend: {
    //   backgroundImage: {
    //     "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
    //     "gradient-conic":
    //       "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
    //   },
    // },
    extend: {
      animation: {
        'enter-in': 'scale-in 150ms ease-in forwards',
      },
      keyframes: {
        'scale-in': {
          '0%': {
            transform: 'scale(0)',
          },
          '100%': {
            transform: 'scale(1.2)',
          },
        }
      }
    }
  },
  plugins: [
    require('flowbite/plugin'),
  ],
};
export default config;
