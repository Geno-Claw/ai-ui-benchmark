import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "AI UI Benchmark",
  description:
    "Compare AI model UI generation — run the same prompt against multiple models, get unique designs, and browse them in a comparison gallery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${sora.variable} ${dmSans.variable} font-[family-name:var(--font-dm-sans)] bg-[#050510] text-gray-100 min-h-screen antialiased`}>
        {/* Aurora animated background */}
        <div className="aurora-bg">
          <div className="aurora-blob-1" />
          <div className="aurora-blob-2" />
          <div className="aurora-blob-3" />
        </div>
        {/* Main content above aurora */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
