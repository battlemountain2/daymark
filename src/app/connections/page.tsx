import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import ConnectionsPage from "@/components/ConnectionsPage";
import "./connections.css";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ youtube?: string }> }) {
  if (!(await isSignedIn())) redirect("/login");
  const params = await searchParams;
  return <ConnectionsPage result={params.youtube?.slice(0, 40)} />;
}
