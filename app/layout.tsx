import type { Metadata, Viewport } from "next";
import "./globals.css";
import ViewportHeight from "./components/ViewportHeight";
import ToastProvider from "./components/ToastProvider";
import { AppProvider } from "./components/AppContext";
import OfflineBanner from "./components/OfflineBanner";

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
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">
        <div className="app-shell">
          <ViewportHeight />
          <AppProvider>
            <ToastProvider>
              <OfflineBanner />
              {children}
            </ToastProvider>
          </AppProvider>
        </div>
      </body>
    </html>
  );
}
