"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookmarkPlus,
  Check,
  ChevronRight,
  ExternalLink,
  FilePenLine,
  Files,
  Layers,
  Lightbulb,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  IDEA_KPIS,
  IDEA_WORKSTREAMS,
  importIdeaLinks,
  modelIdeaEconomics,
  type EconomicsInput,
  type IdeaLane,
} from "@/lib/ideaLab";
import {
  defaultIdeaBrief,
  emptyIdeaWorkspace,
  validateIdeaWorkspace,
  workspaceSources,
  type IdeaBrief,
  type IdeaWorkspace,
} from "@/lib/ideaLabWorkspace";
import styles from "./idea-lab.module.css";
import OutcomeEngine from "./OutcomeEngine";
import {
  evaluateIdeaOutcomeExperiment,
  type IdeaOutcomeExperiment,
} from "@/lib/ideaLabOutcome";

type View = "engine" | "sources" | "queue" | "brief" | "results";
const PREVIEW_KEY = "leadflow-idea-lab-preview-v1";
const usd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
const date = (value: string) =>
  value
    ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Not reviewed";
const firstSources = ["coreyganim", "nutlope", "TristenPalori"];

export default function IdeaLab({ preview = false }: { preview?: boolean }) {
  const [view, setView] = useState<View>("engine");
  const [workspace, setWorkspace] = useState<IdeaWorkspace>(emptyIdeaWorkspace);
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recommended");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [sourceId, setSourceId] = useState("2099848332692623870");
  const [lane, setLane] = useState<IdeaLane>("concierge");
  const [importing, setImporting] = useState(false);
  const [links, setLinks] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const saveStatus = useRef<HTMLDivElement>(null);
  const sources = workspaceSources(workspace);
  const selectedSource =
    sources.find((source) => source.id === sourceId) ?? sources[0];
  const workstream = IDEA_WORKSTREAMS.find((item) => item.id === lane)!;
  const brief =
    workspace.briefs.find((item) => item.lane === lane) ??
    defaultIdeaBrief(lane);
  const related = sources.filter((source) => source.lanes.includes(lane));
  const visibleSources = sources
    .filter((source) => {
      const matchesReview =
        reviewFilter === "all" || source.review === reviewFilter;
      return (
        matchesReview &&
        `${source.title} ${source.author} ${source.lesson} ${source.application}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (sort === "author") return a.author.localeCompare(b.author);
      if (sort === "newest") return b.postedOn.localeCompare(a.postedOn);
      const rank = (author: string) =>
        firstSources.includes(author) ? firstSources.indexOf(author) : 10;
      return (
        rank(a.author) - rank(b.author) || b.postedOn.localeCompare(a.postedOn)
      );
    });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (preview) {
          const saved = localStorage.getItem(PREVIEW_KEY);
          if (saved && active)
            setWorkspace(validateIdeaWorkspace(JSON.parse(saved)));
        } else {
          const response = await fetch("/api/admin/idea-lab", {
            cache: "no-store",
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Unable to load the workspace.");
          if (active) {
            setWorkspace(validateIdeaWorkspace(result.workspace));
            setRevision(result.revision);
          }
        }
        if (active) setReady(true);
      } catch (failure) {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load saved work. Download a draft to keep it.",
          );
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [preview]);

  useEffect(() => {
    if (importing) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [importing]);

  useEffect(() => {
    if (error && !saving) saveStatus.current?.focus();
  }, [error, saving]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (dirty) event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(next: IdeaWorkspace, message: string) {
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const validated = validateIdeaWorkspace(next);
      if (!ready)
        throw new Error(
          "Saved storage is unavailable. Download your brief to keep your work.",
        );
      if (preview) localStorage.setItem(PREVIEW_KEY, JSON.stringify(validated));
      else {
        const response = await fetch("/api/admin/idea-lab", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace: validated, revision }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error || "Save failed. Your edits are still on this screen.",
          );
        setRevision(result.revision);
      }
      setWorkspace(validated);
      setDirty(false);
      setNotice(message);
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Save failed. Download your draft to keep it.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  function changeBrief(patch: Partial<IdeaBrief>) {
    const changed = { ...brief, ...patch, queued: false };
    setWorkspace({
      ...workspace,
      briefs: [
        ...workspace.briefs.filter((item) => item.lane !== lane),
        changed,
      ],
    });
    setDirty(true);
    setNotice("");
  }

  function openBrief(nextLane: IdeaLane) {
    setLane(nextLane);
    setView("brief");
    setNotice("");
  }
  function downloadBrief() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = preview
      ? "/design-preview/idea-lab/export"
      : "/api/admin/idea-lab/export";
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "brief";
    input.value = JSON.stringify(brief);
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    form.remove();
    setNotice(
      "Brief export prepared. Check your downloads for the draft specification.",
    );
  }

  async function submitImport(event: React.FormEvent) {
    event.preventDefault();
    setImportNotice("");
    try {
      const result = importIdeaLinks(links, sources);
      if (workspace.importedUrls.length + result.added.length > 500)
        throw new Error("Keep this workspace under 500 additional sources.");
      if (result.added.length) {
        const next = {
          ...workspace,
          importedUrls: [
            ...workspace.importedUrls,
            ...result.added.map((source) => source.url),
          ],
        };
        const saved = await save(
          next,
          "Sources saved. New imports are waiting for review.",
        );
        if (!saved) return;
        setSourceId(result.added[0].id);
        setView("sources");
        setSearch("");
        setReviewFilter("all");
        setLinks("");
      }
      setImportNotice(
        `${result.added.length} new source${result.added.length === 1 ? "" : "s"}, ${result.duplicates} duplicate${result.duplicates === 1 ? "" : "s"}, ${result.rejectedCount} invalid link${result.rejectedCount === 1 ? "" : "s"}. New sources need review.`,
      );
    } catch (failure) {
      setImportNotice(
        failure instanceof Error ? failure.message : "Import failed.",
      );
    }
  }

  return (
    <div className={styles.root} data-idea-lab>
      <header className={styles.header}>
        <Link
          href={preview ? "/design-preview/idea-lab" : "/admin/command-center"}
          className={styles.brand}
          aria-label="LeadFlow workspace home"
        >
          <Image
            src="/images/brand/leadflow-pro-mark.png"
            width={58}
            height={58}
            alt="LF"
          />
          <span>
            THE LEAD FLOW<small>PRO / YOUR NEXT MOVE</small>
          </span>
        </Link>
        <div className={styles.headerRight}>
          <span>{preview ? "Local working preview" : "Private workspace"}</span>
          <span className={styles.avatar}>
            <UserRound size={20} aria-hidden />
          </span>
        </div>
      </header>
      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <h2>Workspace</h2>
          <div className={styles.labLabel}>
            <Lightbulb size={23} aria-hidden />
            Idea Lab
          </div>
          <nav aria-label="Idea Lab views">
            {(
              [
                { id: "engine", name: "Start", Icon: Sparkles },
                { id: "sources", name: "Sources", Icon: Files },
                { id: "queue", name: "Queue", Icon: Layers },
                { id: "brief", name: "Brief", Icon: FilePenLine },
                { id: "results", name: "Results", Icon: BarChart3 },
              ] as const
            ).map(({ id, name, Icon }) => (
              <button
                key={id}
                type="button"
                disabled={saving}
                aria-current={view === id ? "page" : undefined}
                className={view === id ? styles.navActive : ""}
                onClick={() => setView(id)}
              >
                <Icon size={22} aria-hidden />
                {name}
                {id === "queue" && (
                  <span className={styles.count}>
                    {workspace.briefs.filter((item) => item.queued).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className={styles.sidebarFoot}>
            <p>
              Save the idea.
              <br />
              Define the useful build.
            </p>
            <Link href="/admin/command-center">
              <ArrowLeft size={16} aria-hidden />
              Back Office
            </Link>
          </div>
        </aside>
        <main
          className={styles.main}
          aria-label="Idea Lab workspace"
          inert={saving}
          aria-busy={saving}
        >
          {(notice || error || dirty || !ready) && (
            <div
              className={`${styles.status} ${error ? styles.statusError : ""}`}
              role={error ? "alert" : "status"}
              ref={saveStatus}
              tabIndex={-1}
            >
              {error ||
                notice ||
                (dirty
                  ? "Unsaved changes. Save your work before leaving."
                  : "Loading saved workspace…")}
              {dirty && !saving && ready && (
                <button
                  type="button"
                  onClick={() => void save(workspace, "Workspace saved.")}
                >
                  Save changes
                </button>
              )}
            </div>
          )}
          <div hidden={view !== "engine"}>
            <OutcomeEngine
              experiments={workspace.experiments ?? []}
              ready={ready}
              saving={saving}
              onSave={(experiment: IdeaOutcomeExperiment) => {
                const next = {
                  ...workspace,
                  experiments: [
                    ...(workspace.experiments ?? []).filter(
                      (item) => item.id !== experiment.id,
                    ),
                    experiment,
                  ],
                };
                return save(
                  next,
                  "Test saved. Your comparison is ready to review.",
                );
              }}
            />
          </div>
          {view === "sources" && (
            <div className={styles.sourceGrid}>
              <section className={styles.sourcePane} aria-label="Saved ideas">
                <div className={styles.pageHead}>
                  <h1>Idea Lab</h1>
                  <p>Turn saved ideas into useful work.</p>
                  <small>
                    {
                      sources.filter(
                        (source) => source.review === "post_text_reviewed",
                      ).length
                    }{" "}
                    post texts reviewed · {IDEA_WORKSTREAMS.length} build
                    specifications
                  </small>
                </div>
                <div className={styles.searchRow}>
                  <label className={styles.search}>
                    <Search size={21} aria-hidden />
                    <input
                      aria-label="Search saved posts"
                      placeholder="Search saved posts…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Sort sources"
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                  >
                    <option value="recommended">Recommended</option>
                    <option value="newest">Newest first</option>
                    <option value="author">Author A–Z</option>
                  </select>
                </div>
                <div className={styles.filterRow}>
                  <select
                    aria-label="Source review filter"
                    value={reviewFilter}
                    onChange={(event) => setReviewFilter(event.target.value)}
                  >
                    <option value="all">All sources ({sources.length})</option>
                    <option value="post_text_reviewed">
                      Post text reviewed
                    </option>
                    <option value="awaiting_review">Awaiting review</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setImporting(true);
                      setImportNotice("");
                    }}
                  >
                    <BookmarkPlus size={16} aria-hidden />
                    Save a source
                  </button>
                </div>
                <div className={styles.sourceList}>
                  {visibleSources.map((source) => (
                    <button
                      key={source.id}
                      type="button"
                      aria-pressed={sourceId === source.id}
                      className={`${styles.sourceCard} ${sourceId === source.id ? styles.selected : ""}`}
                      onClick={() => setSourceId(source.id)}
                    >
                      <span className={styles.sourceAvatar}>
                        <UserRound size={34} strokeWidth={1.4} aria-hidden />
                      </span>
                      <span className={styles.sourceCopy}>
                        <strong>{source.title}</strong>
                        <span>@{source.author}</span>
                        <p>
                          {source.lesson ||
                            "New bookmark. Read and review before using it."}
                        </p>
                      </span>
                      <span className={styles.sourceDate}>
                        {date(source.postedOn)}
                        <ChevronRight size={22} aria-hidden />
                      </span>
                    </button>
                  ))}
                  {!visibleSources.length && (
                    <div className={styles.empty}>
                      <Search size={26} aria-hidden />
                      <h2>No matching sources</h2>
                      <p>Try an author, title, or a broader review filter.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setReviewFilter("all");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </section>
              <section className={styles.detail} aria-label="Selected source">
                <h2>{selectedSource.title}</h2>
                <div className={styles.sourceMeta}>
                  @{selectedSource.author} · {date(selectedSource.postedOn)}
                  <a
                    href={selectedSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open original post by ${selectedSource.author}`}
                  >
                    <ExternalLink size={17} aria-hidden />
                  </a>
                </div>
                <div className={styles.lessonCallout}>
                  {selectedSource.lesson ||
                    "This source has been saved. Its content and claims still need review."}
                </div>
                <div className={styles.detailSection}>
                  <h3>Source lesson</h3>
                  <p>{selectedSource.lesson || "Awaiting source review."}</p>
                  <small>
                    {selectedSource.review === "post_text_reviewed"
                      ? `Post text reviewed ${date(selectedSource.reviewedOn!)}. Linked media may need a separate review.`
                      : "A URL alone does not establish what the post supports."}
                  </small>
                </div>
                <div className={styles.detailSection}>
                  <h3>
                    What needs verification{" "}
                    <span className={styles.badge}>Source caveat</span>
                  </h3>
                  <p>{selectedSource.caveat}</p>
                </div>
                <div className={styles.detailSection}>
                  <h3>LeadFlow use</h3>
                  <p>
                    {selectedSource.application ||
                      "Assign a workstream after reading the source."}
                  </p>
                  <div className={styles.chips}>
                    {selectedSource.lanes.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => openBrief(id)}
                      >
                        {IDEA_WORKSTREAMS.find((item) => item.id === id)!.name}
                        <ChevronRight size={14} aria-hidden />
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.detailSection}>
                  <h3>Next moves</h3>
                  <ol className={styles.moves}>
                    {(selectedSource.lanes.length
                      ? IDEA_WORKSTREAMS.find(
                          (item) => item.id === selectedSource.lanes[0],
                        )!.nextMoves
                      : [
                          "Read the original post and relevant attachments",
                          "Separate useful ideas from unverified claims",
                          "Choose one buyer and one result",
                        ]
                    ).map((move, index) => (
                      <li key={move}>
                        <span>{index + 1}</span>
                        {move}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primary}
                    disabled={!selectedSource.lanes.length}
                    onClick={() => openBrief(selectedSource.lanes[0])}
                  >
                    Create build brief
                    <ArrowRight size={20} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => {
                      setImporting(true);
                      setImportNotice("");
                    }}
                  >
                    <BookmarkPlus size={20} aria-hidden />
                    Save a source
                  </button>
                </div>
              </section>
            </div>
          )}
          {view === "queue" && (
            <section className={styles.fullPane}>
              <div className={styles.pageHead}>
                <span className={styles.eyebrow}>
                  FROM INSPIRATION TO A CLEAR SCOPE
                </span>
                <h1>Choose the next useful build.</h1>
                <p>
                  Start with one buyer, one result, and a brief you can review.
                </p>
              </div>
              <div className={styles.queueGrid}>
                {(["first", "next", "research"] as const).map((priority) => (
                  <section key={priority} className={styles.queueColumn}>
                    <h2>
                      {priority === "first"
                        ? "Start here"
                        : priority === "next"
                          ? "Build next"
                          : "Research first"}
                      <span>
                        {
                          IDEA_WORKSTREAMS.filter(
                            (item) => item.priority === priority,
                          ).length
                        }
                      </span>
                    </h2>
                    {IDEA_WORKSTREAMS.filter(
                      (item) => item.priority === priority,
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.queueCard}
                        onClick={() => openBrief(item.id)}
                      >
                        <span className={styles.queueState}>
                          {workspace.briefs.find(
                            (draft) => draft.lane === item.id,
                          )?.queued
                            ? "Queued for build planning"
                            : workspace.briefs.some(
                                  (draft) => draft.lane === item.id,
                                )
                              ? "Saved draft"
                              : "Specification ready"}
                        </span>
                        <h3>{item.name}</h3>
                        <p>{item.outcome}</p>
                        <div>
                          <span>{item.owner}</span>
                          <ArrowRight size={18} aria-hidden />
                        </div>
                      </button>
                    ))}
                  </section>
                ))}
              </div>
              <p className={styles.footnote}>
                A queued brief is a planning item. Product implementation, test
                evidence, and release review are separate steps.
              </p>
            </section>
          )}
          {view === "brief" && (
            <section className={styles.briefGrid}>
              <div className={styles.briefPane}>
                <div className={styles.pageHead}>
                  <span className={styles.eyebrow}>
                    BUILD BRIEF / DRAFT SPECIFICATION
                  </span>
                  <h1>Make the next move clear.</h1>
                  <p>Define a useful result before building.</p>
                </div>
                <label className={styles.field}>
                  Workstream
                  <select
                    value={lane}
                    onChange={(event) =>
                      setLane(event.target.value as IdeaLane)
                    }
                  >
                    {IDEA_WORKSTREAMS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const next = {
                      ...workspace,
                      briefs: [
                        ...workspace.briefs.filter(
                          (item) => item.lane !== lane,
                        ),
                        brief,
                      ],
                    };
                    void save(next, "Brief saved.");
                  }}
                >
                  {(
                    [
                      { key: "buyer", name: "Who is this for?", rows: 2 },
                      {
                        key: "outcome",
                        name: "What useful result should they get?",
                        rows: 2,
                      },
                      { key: "scope", name: "What will we build?", rows: 4 },
                      {
                        key: "acceptance",
                        name: "How will we verify it works?",
                        rows: 4,
                      },
                    ] as const
                  ).map(({ key, name, rows }) => (
                    <label className={styles.field} key={key}>
                      {name}
                      <textarea
                        required
                        maxLength={6000}
                        rows={rows}
                        value={brief[key]}
                        disabled={saving}
                        onChange={(event) =>
                          changeBrief({ [key]: event.target.value })
                        }
                      />
                    </label>
                  ))}
                  <div className={styles.actions}>
                    <button
                      type="submit"
                      className={styles.primary}
                      disabled={saving || !ready}
                    >
                      {saving ? "Saving…" : "Save brief"}
                      <Check size={18} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={downloadBrief}
                    >
                      Download brief
                    </button>
                  </div>
                  <button
                    className={styles.queueButton}
                    type="button"
                    disabled={
                      saving ||
                      !ready ||
                      brief.queued ||
                      [
                        brief.buyer,
                        brief.outcome,
                        brief.scope,
                        brief.acceptance,
                      ].some((field) => !field.trim())
                    }
                    onClick={() => {
                      const next = {
                        ...workspace,
                        briefs: [
                          ...workspace.briefs.filter(
                            (item) => item.lane !== lane,
                          ),
                          { ...brief, queued: true },
                        ],
                      };
                      void save(
                        next,
                        "Brief saved to the build queue. No execution has started.",
                      ).then((saved) => {
                        if (saved) setView("queue");
                      });
                    }}
                  >
                    {brief.queued
                      ? "In the build queue"
                      : "Save and add to build queue"}
                    <ArrowRight size={17} aria-hidden />
                  </button>
                </form>
              </div>
              <aside className={styles.briefEvidence}>
                <h2>{workstream.name}</h2>
                <p>{workstream.outcome}</p>
                <div className={styles.detailSection}>
                  <h3>Owner</h3>
                  <p>{workstream.owner}</p>
                  <h3>Commercial path</h3>
                  <p>{workstream.commercialPath}</p>
                </div>
                <div className={styles.detailSection}>
                  <h3>Inputs needed</h3>
                  <ul>
                    {workstream.requiredInputs.map((input) => (
                      <li key={input}>{input}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.detailSection}>
                  <h3>
                    Source trail{" "}
                    <span className={styles.badge}>{related.length} posts</span>
                  </h3>
                  {related.map((source) => (
                    <a
                      className={styles.evidenceLink}
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <strong>{source.title}</strong>
                      <span>
                        @{source.author}
                        <ExternalLink size={14} aria-hidden />
                      </span>
                    </a>
                  ))}
                </div>
                <div className={styles.boundary}>
                  <Lightbulb size={19} aria-hidden />
                  <p>
                    This brief defines the work. A person still reviews the
                    finished build before deployment, outreach, or spending.
                  </p>
                </div>
              </aside>
            </section>
          )}
          {view === "results" && (
            <section className={styles.fullPane}>
              <div className={styles.pageHead}>
                <span className={styles.eyebrow}>
                  MEASURE WHAT ACTUALLY HAPPENED
                </span>
                <h1>Useful work. Real outcomes.</h1>
                <p>
                  Review your saved tests. Delivery and payment metrics need
                  verified provider records.
                </p>
              </div>
              {(workspace.experiments ?? []).length > 0 && (
                <div
                  className={styles.kpiGrid}
                  aria-label="Saved test comparisons"
                >
                  {(workspace.experiments ?? []).map((experiment) => {
                    const assessment =
                      evaluateIdeaOutcomeExperiment(experiment);
                    const lift = assessment.metrics.bookingLiftPoints;
                    return (
                      <article key={experiment.id}>
                        <h2>{experiment.name}</h2>
                        <strong>
                          {lift === null
                            ? "Not measured"
                            : `${lift > 0 ? "+" : ""}${Number(lift.toFixed(1))} pp`}
                        </strong>
                        <p>
                          {assessment.label}. {assessment.summary}
                        </p>
                        <small>
                          Manually recorded comparison. Review the evidence in
                          Start → Open a saved test.
                        </small>
                      </article>
                    );
                  })}
                </div>
              )}
              <div className={styles.kpiGrid}>
                {IDEA_KPIS.map((kpi) => (
                  <article key={kpi.id}>
                    <h2>{kpi.name}</h2>
                    <strong>Not measured</strong>
                    <p>{kpi.definition}</p>
                    <small>{kpi.source}</small>
                  </article>
                ))}
              </div>
              <Economics />
            </section>
          )}
          <footer className={styles.workspaceFooter}>
            {preview
              ? "Local preview · saves in this browser · separate from your live workspace"
              : "Private account workspace · ideas, drafts, and recorded comparisons"}
            <span>External execution disabled</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        className={styles.dialog}
        onClose={() => setImporting(false)}
        aria-labelledby="import-title"
      >
        <div className={styles.dialogHead}>
          <h2 id="import-title">Save more ideas</h2>
          <button
            type="button"
            aria-label="Close source import"
            onClick={() => setImporting(false)}
          >
            <X size={21} aria-hidden />
          </button>
        </div>
        <p>
          Paste one X post URL per line. We’ll remove duplicates and keep new
          posts waiting for review.
        </p>
        <form onSubmit={submitImport}>
          <label className={styles.field}>
            Post URLs
            <textarea
              autoFocus
              required
              maxLength={100000}
              rows={7}
              value={links}
              disabled={saving}
              placeholder="https://x.com/author/status/1234567890123456789"
              onChange={(event) => setLinks(event.target.value)}
            />
          </label>
          <p className={styles.importResult} role="status">
            {importNotice || error}
          </p>
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.primary}
              disabled={saving || !ready}
            >
              {saving ? "Saving…" : "Import sources"}
              <ArrowRight size={18} aria-hidden />
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setImporting(false)}
            >
              Done
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

const initialScenario: EconomicsInput = {
  months: 12,
  startingCustomers: 0,
  newCustomersPerMonth: 30,
  monthlyPriceUsd: 99,
  monthlyChurnRate: 0.05,
  variableCostPerCustomerUsd: 15,
  supportHoursPerCustomer: 0.5,
  hourlyCostUsd: 40,
  fixedCostUsd: 1000,
  acquisitionCostPerCustomerUsd: 20,
};
const scenarioFields: {
  key: keyof EconomicsInput;
  name: string;
  step?: number;
  max?: number;
}[] = [
  { key: "months", name: "Months", max: 60 },
  { key: "startingCustomers", name: "Starting customers" },
  { key: "newCustomersPerMonth", name: "New customers / month" },
  { key: "monthlyPriceUsd", name: "Monthly price ($)", step: 0.01 },
  { key: "monthlyChurnRate", name: "Monthly churn (0–1)", step: 0.01, max: 1 },
  {
    key: "variableCostPerCustomerUsd",
    name: "Vendor cost / customer ($)",
    step: 0.01,
  },
  {
    key: "supportHoursPerCustomer",
    name: "Support hours / customer",
    step: 0.1,
  },
  { key: "hourlyCostUsd", name: "Labor cost / hour ($)", step: 0.01 },
  { key: "fixedCostUsd", name: "Fixed cost / month ($)", step: 0.01 },
  {
    key: "acquisitionCostPerCustomerUsd",
    name: "Acquisition cost / new customer ($)",
    step: 0.01,
  },
];
function Economics() {
  const [inputs, setInputs] = useState<Record<keyof EconomicsInput, string>>(
    () =>
      Object.fromEntries(
        Object.entries(initialScenario).map(([key, value]) => [
          key,
          String(value),
        ]),
      ) as Record<keyof EconomicsInput, string>,
  );
  let scenario: ReturnType<typeof modelIdeaEconomics> | null = null;
  let error = "";
  try {
    if (Object.values(inputs).some((value) => !value.trim()))
      throw new Error("Fill in every assumption to calculate a scenario.");
    scenario = modelIdeaEconomics(
      Object.fromEntries(
        Object.entries(inputs).map(([key, value]) => [key, Number(value)]),
      ) as EconomicsInput,
    );
    if (
      scenario.rows.some((row) =>
        Object.values(row).some((value) => !Number.isFinite(value)),
      )
    )
      throw new Error("These assumptions exceed the calculation range.");
  } catch (failure) {
    error =
      failure instanceof Error ? failure.message : "Check the assumptions.";
    scenario = null;
  }
  const last = scenario?.rows.at(-1);
  return (
    <section className={styles.economics}>
      <div className={styles.sectionHead}>
        <h2>Test the assumptions</h2>
        <span className={styles.badge}>Illustrative scenario</span>
      </div>
      <p>
        Edit the price, churn, acquisition, and support costs. These numbers are
        assumptions and do not change any offer.
      </p>
      <div className={styles.scenarioGrid}>
        {scenarioFields.map(({ key, name, step = 1, max }) => (
          <label className={styles.field} key={key}>
            {name}
            <input
              type="number"
              min={key === "months" ? 1 : 0}
              max={max}
              step={step}
              value={inputs[key]}
              onChange={(event) =>
                setInputs({ ...inputs, [key]: event.target.value })
              }
            />
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className={styles.calculationError}>
          {error}
        </p>
      )}
      {last && (
        <>
          <div className={styles.scenarioSummary}>
            <div>
              <span>Month {last.month} gross revenue</span>
              <strong>{usd(last.grossRevenueUsd)}</strong>
            </div>
            <div>
              <span>Contribution after modeled costs</span>
              <strong>{usd(last.contributionUsd)}</strong>
            </div>
            <div>
              <span>Monthly support effort</span>
              <strong>{last.supportHours.toFixed(1)} hours</strong>
            </div>
          </div>
          <details className={styles.tableDetails}>
            <summary>View monthly calculation</summary>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Expected customers</th>
                    <th>Revenue</th>
                    <th>Costs</th>
                    <th>Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario!.rows.map((row) => (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td>{row.expectedCustomers.toFixed(1)}</td>
                      <td>{usd(row.grossRevenueUsd)}</td>
                      <td>{usd(row.operatingCostUsd)}</td>
                      <td>{usd(row.contributionUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <p className={styles.footnote}>{scenario!.caveat}</p>
        </>
      )}
    </section>
  );
}
