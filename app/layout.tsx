import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ViewportHeight from "./components/ViewportHeight";
import ToastProvider from "./components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FomoDoro - Focus. Repeat.",
  description:
    "A quiet productivity powerhouse. Pomodoro timer, ambient sounds, tasks, notes, and kanban - all in one focused app.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "dark light",
  themeColor: "#06080f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full overflow-hidden">
        <div className="app-shell">
          <ViewportHeight />
          <ToastProvider>{children}</ToastProvider>
        </div>
      </body>
    </html>
  );
}
