import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

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
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
