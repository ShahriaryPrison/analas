import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ANALAS — Open analytics for developers",
  description:
    "Capture every user action with a single HTTP call. Real-time captures and insights powered by ClickHouse. No SDK required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
