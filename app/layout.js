import { Cormorant_Garamond, IBM_Plex_Mono, Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif-cn",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif-en",
  display: "swap",
});

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans-cn",
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-code",
  display: "swap",
});

export const metadata = {
  title: "CHAOS DREAM LAB · 梦境胶片放映厅",
  description: "记录醒来前的只言片语，在暗房显影成一段永不褪色的梦境胶片。",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${notoSerif.variable} ${cormorant.variable} ${notoSans.variable} ${ibmMono.variable}`}
    >
      <body className="min-h-screen bg-[#061117] text-[#EAF4F4] antialiased selection:bg-[#7DD8E8]/30 selection:text-[#F4FCFD]">
        {children}
      </body>
    </html>
  );
}
