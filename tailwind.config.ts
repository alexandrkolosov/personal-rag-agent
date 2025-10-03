import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            // Claude-inspired color palette
            colors: {
                // Warm backgrounds (light theme)
                'warm': {
                    50: '#FAFAF8',   // Primary background (warm off-white)
                    100: '#F4F2EE',  // Secondary background (cream)
                    200: '#EEEAE4',  // Hover state (light warm gray)
                    300: '#E8E5E0',  // Light border
                    400: '#D4CFC7',  // Medium border
                    500: '#9B9892',  // Muted text
                    600: '#6B6662',  // Secondary text
                    700: '#2D2A26',  // Primary text (warm dark brown)
                    800: '#252220',  // Dark variant
                    900: '#1A1816',  // Darkest
                },
                // Warm orange accent (Claude's signature color)
                'accent': {
                    50: '#FFF9F6',   // Very light orange tint
                    100: '#FFEEE6',
                    200: '#FFD4C1',
                    300: '#F5B89A',
                    400: '#E09977',
                    500: '#D97757',  // Primary accent (warm orange)
                    600: '#CE8C6A',  // Secondary accent (soft terracotta)
                    700: '#C76845',  // Darker orange
                    800: '#B5502E',
                    900: '#8F3D1F',
                },
                // Semantic colors
                'success': '#5B9A72',  // Muted green
                'info': '#6B8AC9',     // Soft blue
                'warning': '#E0A54E',  // Warm yellow
            },
            // Typography
            fontFamily: {
                'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
            },
            // Spacing scale (generous, Claude-style)
            spacing: {
                '18': '4.5rem',   // 72px
                '22': '5.5rem',   // 88px
                '26': '6.5rem',   // 104px
                '30': '7.5rem',   // 120px
            },
            // Border radius (softer corners)
            borderRadius: {
                'xl': '12px',
                '2xl': '16px',
                '3xl': '20px',
            },
            // Box shadows (subtle, not harsh)
            boxShadow: {
                'sm': '0 1px 2px rgba(0, 0, 0, 0.03)',
                'DEFAULT': '0 1px 3px rgba(0, 0, 0, 0.05)',
                'md': '0 2px 4px rgba(0, 0, 0, 0.06)',
                'lg': '0 4px 8px rgba(0, 0, 0, 0.08)',
                'xl': '0 8px 16px rgba(0, 0, 0, 0.10)',
                'accent': '0 2px 4px rgba(217, 119, 87, 0.2)',
            },
            // Animation durations
            transitionDuration: {
                '250': '250ms',
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
};
export default config;