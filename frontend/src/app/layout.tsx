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
                <script
                    dangerouslySetInnerHTML={{
                        __html: `try{var t=localStorage.getItem("siakad_theme");if(t){document.documentElement.setAttribute("data-theme", t)}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.setAttribute("data-theme", "dark")}}catch(e){}try{var r=localStorage.getItem("siakad_role");if(r){document.documentElement.setAttribute("data-role", r)}}catch(e){}`,
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
