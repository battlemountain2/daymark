import type { Metadata } from "next";

/**
 * The login screen is the one page a stranger can reach, so it shouldn't
 * announce whose dashboard this is — in the heading or the browser tab.
 */
export const metadata: Metadata = {
  title: "Daymark",
  description: "Sign in.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
