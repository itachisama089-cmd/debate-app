import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Headline font (Elegant Serif)
const fraunces = Fraunces({ 
  subsets: ["latin"], 
  variable: "--font-fraunces",
  display: 'swap',
});

// Body font (Clean Sans)
const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Parley | Two sides. One table.",
  description: "Debate. Discuss. Decide.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="font-inter bg-[var(--color-bg)] text-[var(--color-text)]">
        {children}
      </body>
    </html>
  );
}