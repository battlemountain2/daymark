import type { MetadataRoute } from "next";

/**
 * Makes the dashboard installable to a phone home screen.
 *
 * `display: standalone` drops the browser chrome, which matters on a phone
 * between classes: it opens like an app rather than a tab you have to find.
 *
 * Note for iOS: a home-screen web app gets its own storage context, separate
 * from Safari's. You sign in once inside it, and the session cookie is a
 * persistent 90-day one, so that login lasts the semester.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daymark",
    short_name: "Daymark",
    description: "One page: what's due, what's next, what matters.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#EAEFEA",
    theme_color: "#2E6144",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
