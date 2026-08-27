import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { getTerm } from "@/lib/get-term";
import TermEditor from "@/components/TermEditor";

export const dynamic = "force-dynamic";

export default async function TermPage() {
  if (!(await isSignedIn())) redirect("/login");
  return <TermEditor initial={await getTerm()} />;
}
