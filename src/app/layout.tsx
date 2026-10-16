import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ProgressProvider } from "@/lib/progress";
import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/ui/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Hardware Academy",
    template: "%s · Hardware Academy",
  },
  description:
    "Silicon to motion: a 14-day hands-on path through semiconductors, PCBs, robotics, EV powertrains and AI-assisted design.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ProgressProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </ProgressProvider>
      </body>
    </html>
  );
}
