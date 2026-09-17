import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { renderableCaseStudies, type RenderableCaseStudy } from "@/lib/site/caseStudies";

// The proof framework. Renders approved case studies with dated, defined
// metrics and the disclosure line; renders nothing when there is nothing
// approved. Never a placeholder logo, never an invented figure.

function Study({ study }: { study: RenderableCaseStudy }) {
  const external = study.href.startsWith("http");
  const Wrapper = external ? "a" : Link;
  return (
    <article className={`cb-case cb-case--${study.kind === "founder" ? "flip" : "plain"}`}>
      <div className="cb-case-shot">
        <Image src={study.shot} alt={study.alt} width={1200} height={630} sizes="(max-width: 900px) 92vw, 46vw" />
      </div>
      <div className="cb-case-block">
        <span className={`cb-case-kind cb-case-kind--${study.kind === "client" ? "client" : study.kind === "founder" ? "founder" : "private"}`}>
          {study.kindLabel} · {study.industry} · {study.town}
        </span>
        <h3 className="cb-h2 cb-h2--case">{study.business}</h3>
        <p className="cb-case-what">
          <strong>The problem.</strong> {study.problem}
        </p>
        <p className="cb-case-what">
          <strong>What was built.</strong> {study.built}
        </p>
        <p className="cb-case-what">
          <strong>Owned by the client.</strong> {study.ownedByClient}
        </p>
        {study.metrics.length > 0 ? (
          <dl className="cb-case-facts">
            {study.metrics.map((m) => (
              <div key={m.id}>
                <dt>{m.label}</dt>
                <dd>
                  <strong>{m.value}</strong>
                  <small>
                    {m.window} · as of {m.asOfLabel}
                    {m.stale ? " · due for a refresh" : ""}
                  </small>
                  <small>{m.definition}</small>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {study.disclosure ? <p className="cb-quotenote">{study.disclosure}</p> : null}
        <div className="cb-case-foot">
          <Wrapper href={study.href} className="cb-textlink" {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
            Open the work <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Wrapper>
        </div>
      </div>
    </article>
  );
}

export default function CaseStudies({ ids }: { ids?: string[] }) {
  const studies = renderableCaseStudies().filter((s) => !ids || ids.includes(s.id));
  if (studies.length === 0) return null;
  return (
    <div className="cb-cases">
      {studies.map((study) => (
        <Study key={study.id} study={study} />
      ))}
    </div>
  );
}
