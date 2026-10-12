import type {Metadata} from "next";
import { Inter } from "next/font/google";
import './global.css';
import { ThemeProvider } from '@/lib/ThemeContext';
import FloatingGlassControl from './components/FloatingGlassControl';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: "swap",
});

export const metadata: Metadata = {
    title: 'E-Rapor SMP Al-Hidayah',
    description: 'Sistem E-Rapor Berbasis Web Terintegrasi - SMP Al-Hidayah',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="id" className={inter.variable} suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `try{var t=localStorage.getItem("siakad_theme");if(t){document.documentElement.setAttribute("data-theme", t)}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.setAttribute("data-theme", "dark")};var v=localStorage.getItem("glass-intensity");if(v!==null)document.documentElement.style.setProperty("--glass-intensity", v)}catch(e){}`,
                    }}
                />
            </head>
            <body>
                <ThemeProvider>
                    <FloatingGlassControl />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}