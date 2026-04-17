import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPlaybook } from "@/lib/playbooks";
import { PlaybookRunner } from "./PlaybookRunner";

export default function PlaybookRunPage({ params }: { params: { id: string } }) {
  const playbook = getPlaybook(params.id);
  if (!playbook) notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/playbooks"
          className="inline-flex items-center gap-1 text-sm text-ink-300 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All playbooks
        </Link>
        <p className="mt-4 text-cyan-400 text-sm font-semibold">{playbook.industry}</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">{playbook.title}</h1>
        <p className="mt-2 text-ink-300">{playbook.goal}</p>
      </div>

      <PlaybookRunner playbook={playbook} />
    </div>
  );
}
