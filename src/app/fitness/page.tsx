import "../fitness-room.css";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import FitnessView from "@/components/FitnessView";

export const dynamic = "force-dynamic";

export default async function FitnessPage({searchParams}:{searchParams?:Promise<{session?:string}>}) {
  if (!(await isSignedIn())) redirect("/login");
  return <FitnessView initialSessionId={(await searchParams)?.session} />;
}
