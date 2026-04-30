import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeForge",
  description: "바이브코더를 위한 CS 학습·토론 사이트",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
