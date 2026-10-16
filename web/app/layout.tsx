import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:4173"),
  ),
  title: "Mushroom Atlas | Deep learning, closer to nature",
  description:
    "Explore an EfficientNetB0 mushroom image classifier running privately in your browser. An educational machine-learning project by Anup & Harith.",
  openGraph: {
    title: "Mushroom Atlas",
    description:
      "Deep learning, closer to nature. Explore browser-based mushroom image classification.",
    type: "website",
    images: [
      {
        url: "/social-preview.png",
        width: 800,
        height: 800,
        alt: "Botanical mushroom illustration",
      },
    ],
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
