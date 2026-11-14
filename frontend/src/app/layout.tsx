import type { Metadata } from "next";
import './global.css';
import { ThemeProvider } from '@/lib/ThemeContext';

export const metadata: Metadata = {
    title: 'E-Rapor SMP Al-Hidayah Medan',
    description: 'Sistem Informasi Evaluasi Belajar & E-Rapor Digital Terintegrasi - SMP Al-Hidayah Medan',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="id" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Lora:wght@600;700&display=swap"
                    rel="stylesheet"
                />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `try{var t=localStorage.getItem("siakad_theme");if(t){document.documentElement.setAttribute("data-theme", t)}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.setAttribute("data-theme", "dark")}}catch(e){}`,
                    }}
                />
            </head>
            <body>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
