import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daymark",
  description: "One page: what's due, what's next, what matters.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Daymark", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
};

/** Matches the forest ground, so the phone's chrome doesn't fight the page. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EAEFEA" },
    { media: "(prefers-color-scheme: dark)", color: "#101A13" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=JetBrains+Mono:wght@400;500&family=Source+Sans+3:wght@400;600;700&display=swap"
        />
        {/* Apply the saved palette before first paint, or the page flashes the
            wrong theme on every load. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `try{var p=localStorage.getItem("hb:pal");` +
              `if(p&&p!=="forest")document.documentElement.setAttribute("data-palette",p);` +
              // Only on /sky. A rough hour check there avoids a white flash
              // before the real solar calculation runs a frame later and
              // corrects it.
              //
              // This used to run on every page, and stamping *any* explicit
              // `data-theme` defeats the whole `:root:not([data-theme="light"])`
              // arrangement in the stylesheet: between 6am and 8pm it wrote
              // `light`, so a phone set to dark mode got a light dashboard all
              // day, every day, and no setting could override it. Only the sky
              // page is supposed to follow the sun instead of the system.
              `if(location.pathname.indexOf("/sky")===0){` +
              `var h=new Date().toLocaleString("en-US",{timeZone:"America/Denver",hour:"numeric",hour12:false});` +
              `document.documentElement.setAttribute("data-theme",(+h<6||+h>=20)?"dark":"light");}` +
              `}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
