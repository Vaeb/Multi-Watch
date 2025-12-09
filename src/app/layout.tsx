import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata: Metadata = {
  title: "MultiWatch",
  description: "NoPixel MultiWatch by Vaeb",
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
      {/* <head>
        <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />
      </head> */}
      <body className="overflow-hidden" suppressHydrationWarning={true}>
        {children}
      </body>
      <GoogleAnalytics gaId="G-7TN622F9NN" />
    </html>
  );
}
