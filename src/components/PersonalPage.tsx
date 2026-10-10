"use client";
import DeskSidebar from "./DeskSidebar";
import { usePersonalRecords } from "@/lib/use-personal-records";
import { useDeskTheme } from "@/lib/use-desk-theme";
import {type DashboardTab} from "@/lib/dashboard-layout";
export default function PersonalPage({ children, space = "school", login = false }: { children: React.ReactNode; space?: DashboardTab; login?: boolean }) {
  const { records } = usePersonalRecords<unknown>("daymark:layout");
  const theme = useDeskTheme(space, records);
  return <div className={`personal-dashboard ${login ? "desk-login" : "study-workspace"}`} data-palette={theme.palette} data-accent={theme.accent} data-appearance={theme.appearance} data-density={theme.density}>
    {!login && <DeskSidebar space={space} layout={records} />}
    <main className={login ? "login-stage" : "desk-stage"}>{children}</main>
  </div>;
}
