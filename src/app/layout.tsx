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
        {/* Apply the saved palette before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `try{var p=localStorage.getItem("hb:pal")||localStorage.getItem("palette");` +
              `if(p&&p!=="forest")document.documentElement.setAttribute("data-palette",p);` +
              `if(location.pathname.indexOf("/sky")===0){` +
              `var h=new Date().toLocaleString("en-US",{timeZone:"America/Denver",hour:"numeric",hour12:false});` +
              `document.documentElement.setAttribute("data-theme",(+h<6||+h>=20)?"dark":"light");}` +
              `}catch(e){}` +
              `if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){});});}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
