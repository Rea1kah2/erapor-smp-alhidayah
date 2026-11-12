import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('postcss').ProcessOptions} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: __dirname,
    },
  },
};

export default config;
