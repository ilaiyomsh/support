/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                monday: {
                    blue: "#5034ff",
                    hover: "#432bdb",
                    bg: "#f5f6f8",
                    text: "#323338",
                    secondary: "#676879",
                    border: "#e6ecf8"
                }
            }
        },
    },
    plugins: [],
}
