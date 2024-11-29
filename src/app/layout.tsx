import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "MultiWatch",
  description: "MultiWatch by Vaeb",
  icons: [{ rel: "icon", url: "/besties.png" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable}`}
    >
      <body suppressHydrationWarning={true}>
        <Script
          src="https://player.twitch.tv/js/embed/v1.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
