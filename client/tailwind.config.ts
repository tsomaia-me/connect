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
        open: 'open 0.25s ease-out forwards',
        close: 'close 0.25s ease-out forwards',
      },
      keyframes: {
        'scale-in': {
          '0%': {
            transform: 'scale(0)',
          },
          '100%': {
            transform: 'scale(1.1)',
          },
        },
        open: {
          '0%': { transform: 'translateY(-10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        close: {
          '0%': { transform: 'translateY(0)', opacity: 1 },
          '100%': { transform: 'translateY(-10px)', opacity: 0 },
        },
      }
    }
  },
  plugins: [
    require('flowbite/plugin'),
  ],
};
export default config;
