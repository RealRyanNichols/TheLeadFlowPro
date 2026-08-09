import { createClient } from "@/lib/supabase/server";
import ProjectsManager from "./ProjectsManager";

export default async function AdminProjects() {
  const supabase = await createClient();

  const [{ data: projects }, { data: clients }] = await Promise.all([
    supabase
      .from("projects")
      .select("*, milestones(*), profiles(full_name, email)")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
  ]);

  return <ProjectsManager initialProjects={projects ?? []} clients={clients ?? []} />;
}
