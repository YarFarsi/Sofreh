import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "سامانه رزرو غذا",
  description: "سامانه درون‌سازمانی رزرو غذا",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa-IR" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
