import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { getStudyHubData } from "@/lib/study-hub";
import StudyView from "@/components/StudyView";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  if (!(await isSignedIn())) redirect("/login");
  const data = await getStudyHubData();
  return <StudyView data={data} />;
}
