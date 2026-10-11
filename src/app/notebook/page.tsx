import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import NotebookWorkspace from "@/components/NotebookWorkspace";

export const dynamic = "force-dynamic";
export default async function NotebookPage({ searchParams }: { searchParams: Promise<{ course?: string; note?: string }> }) {
  if (!(await isSignedIn())) redirect("/login");
  const params = await searchParams;
  return <NotebookWorkspace course={params.course?.slice(0, 500)} noteId={params.note?.slice(0, 500)} />;
}
