"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Save, ShieldCheck } from "lucide-react";
import {
  INDUSTRIES,
  SERVICE_NAMES,
  STAGE_LABELS,
} from "@/lib/service-areas/catalog";
import {
  conflicts,
  geometryLabel,
  inquiryGeometry,
  interestExpiration,
  validateRegistry,
  type Geometry,
  type Inquiry,
  type Registry,
  type Territory,
} from "@/lib/service-areas/engine";
import styles from "./service-areas.module.css";

type Intake = {
  id: string;
  lead_id: string | null;
  crm_status?: "pending_manual_handoff";
  document: Inquiry;
  created_at: string;
};
function fresh(): Territory {
  return {
    id: crypto.randomUUID(),
    clientName: "New territory",
    industry: "farm-ag",
    services: ["land-clearing", "earthwork", "ponds", "hay", "ag-services"],
    exclusivity: "industry",
    stage: "review",
    geometry: { kind: "unknown" },
    centerVerified: false,
    publicGeometry: null,
    publicRegion: "",
    publicApproved: false,
    publicConsent: "",
    evidence: "",
    notes: "",
    expiresAt: null,
    inquiryId: null,
    adRadiusMiles: null,
    adTargetingVerified: false,
  };
}
function GeometryEditor({
  value,
  onChange,
  prefix,
  publicDisplay = false,
}: {
  value: Geometry | null;
  onChange: (v: Geometry | null) => void;
  prefix: string;
  publicDisplay?: boolean;
}) {
  return (
    <>
      <label htmlFor={`${prefix}-kind`}>
        {publicDisplay ? "Anonymous map display" : "Agreed operating territory"}
      </label>
      <select
        id={`${prefix}-kind`}
        value={value?.kind ?? "none"}
        onChange={(e) => {
          const k = e.target.value;
          onChange(
            k === "none"
              ? null
              : k === "radius"
                ? { kind: "radius", center: { lat: 0, lng: 0 }, miles: 35 }
                : k === "states"
                  ? { kind: "states", states: ["TX"] }
                  : k === "national"
                    ? { kind: "national" }
                    : { kind: "unknown" },
          );
        }}
      >
        {publicDisplay ? (
          <option value="none">Keep off the public map</option>
        ) : (
          <option value="unknown">Needs confirmation</option>
        )}
        <option value="radius">Radius from an operating base</option>
        <option value="states">One or more states</option>
        <option value="national">United States</option>
      </select>
      {value?.kind === "radius" && (
        <div className={styles.adminFieldGrid}>
          <div>
            <label htmlFor={`${prefix}-lat`}>
              {publicDisplay
                ? "Public display latitude"
                : "Private base latitude"}
            </label>
            <input
              id={`${prefix}-lat`}
              type="number"
              step="any"
              value={value.center.lat || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  center: { ...value.center, lat: Number(e.target.value) },
                })
              }
            />
          </div>
          <div>
            <label htmlFor={`${prefix}-lng`}>
              {publicDisplay
                ? "Public display longitude"
                : "Private base longitude"}
            </label>
            <input
              id={`${prefix}-lng`}
              type="number"
              step="any"
              value={value.center.lng || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  center: { ...value.center, lng: Number(e.target.value) },
                })
              }
            />
          </div>
          <div>
            <label htmlFor={`${prefix}-miles`}>Radius (miles)</label>
            <input
              id={`${prefix}-miles`}
              type="number"
              min="1"
              max="500"
              value={value.miles}
              onChange={(e) =>
                onChange({ ...value, miles: Number(e.target.value) })
              }
            />
          </div>
        </div>
      )}
      {value?.kind === "states" && (
        <>
          <label htmlFor={`${prefix}-states`}>
            State abbreviations, separated by commas
          </label>
          <input
            id={`${prefix}-states`}
            value={value.states.join(",")}
            placeholder="TX, LA, OK"
            onChange={(e) =>
              onChange({
                kind: "states",
                states: e.target.value
                  .toUpperCase()
                  .split(",")
                  .map((s) => s.trim()),
              })
            }
          />
        </>
      )}
    </>
  );
}
export default function TerritoryAdmin({
  initial,
  preview = false,
}: {
  initial: Registry;
  preview?: boolean;
}) {
  const [registry, setRegistry] = useState(initial),
    [selected, setSelected] = useState(initial.territories[0]?.id ?? ""),
    [revision, setRevision] = useState(0),
    [inquiries, setInquiries] = useState<Intake[]>([]),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(preview),
    [dirty, setDirty] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (preview) {
      try {
        const raw = localStorage.getItem("leadflow-territory-preview-v1");
        if (raw) {
          const r = validateRegistry(JSON.parse(raw));
          setRegistry(r);
          setSelected(r.territories[0]?.id ?? "");
        }
      } catch {
        setError("The local preview draft could not be restored.");
      }
      return;
    }
    let alive = true;
    fetch("/api/admin/service-areas", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (alive) {
          setRegistry(d.registry);
          setSelected(d.registry.territories[0]?.id ?? "");
          setRevision(d.revision);
          setInquiries(d.inquiries);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (alive)
          setError(
            e instanceof Error
              ? e.message
              : "Could not load the territory register.",
          );
      });
    return () => {
      alive = false;
    };
  }, [preview]);
  const current = registry.territories.find((t) => t.id === selected),
    overlaps = current ? conflicts(current, registry.territories) : [];
  function update(patch: Partial<Territory>) {
    setRegistry((r) => ({
      ...r,
      territories: r.territories.map((t) =>
        t.id === selected ? { ...t, ...patch } : t,
      ),
    }));
    setDirty(true);
    setStatus("");
    setError(null);
  }
  function add(t = fresh()) {
    setRegistry((r) => ({ ...r, territories: [...r.territories, t] }));
    setSelected(t.id);
    setDirty(true);
    setStatus("");
  }
  function reviewInquiry(i: Intake) {
    if (registry.territories.some((t) => t.inquiryId === i.id)) {
      setError(
        "This inquiry already has a territory record. Edit that record instead.",
      );
      return;
    }
    add({
      ...fresh(),
      clientName: i.document.business,
      industry: i.document.industry,
      services: i.document.services,
      stage: "interest",
      geometry: inquiryGeometry(i.document),
      expiresAt: interestExpiration(new Date(i.created_at)),
      inquiryId: i.id,
      evidence: `Website inquiry ${i.id}, received ${i.created_at}. Verify this is a genuine business inquiry before approving public interest.`,
      notes:
        "Inquiry market is a city reference, not a verified operating base. Interest is not a reservation.",
      publicRegion: i.document.market,
      publicConsent: i.document.publicConsent
        ? "Lead consented to anonymous industry and broad-market display at signup. Verify before approval."
        : "",
    });
  }
  async function save() {
    setError(null);
    setStatus("");
    setBusy(true);
    try {
      const checked = validateRegistry(registry);
      if (preview) {
        localStorage.setItem(
          "leadflow-territory-preview-v1",
          JSON.stringify(checked),
        );
        setDirty(false);
        setStatus(
          "Saved on this device for preview. No production map or ad account changed.",
        );
        return;
      }
      const response = await fetch("/api/admin/service-areas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registry: checked, revision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRevision(result.revision);
      setDirty(false);
      setStatus(
        "Register saved. Approved anonymous map records now reflect this revision. Ad accounts were not changed.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your changes were not saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.editor}>
      {preview && (
        <p className={styles.preview}>
          PRIVATE LOCAL PREVIEW · Saves stay on this device. Hosted persistence
          requires private droplet storage and normal admin sign-in.
        </p>
      )}
      <div className={styles.adminTop}>
        <div>
          <h2>Territories & area interest</h2>
          <p>
            Verify the source. Confirm the base. Check competing services.
            Protect the agreed area.
          </p>
        </div>
        <div className={styles.adminActions}>
          <button
            type="button"
            className={styles.adminSecondary}
            disabled={!loaded}
            onClick={() => add()}
          >
            <Plus size={14} className="mr-1 inline" />
            Add territory
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={busy || !loaded || !dirty}
            onClick={save}
          >
            <Save size={16} />
            {busy ? "Saving…" : "Save register"}
          </button>
        </div>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className={styles.adminStatus} role="status">
        {status ||
          (!loaded
            ? "Loading private registry…"
            : dirty
              ? "Unsaved changes"
              : `${registry.territories.length} private territory records · revision ${revision}`)}
      </p>
      <div className={styles.adminGrid}>
        <nav className={styles.adminList} aria-label="Territory records">
          {registry.territories.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={selected === t.id}
              onClick={() => setSelected(t.id)}
            >
              {t.clientName}
              <small>
                {INDUSTRIES.find((i) => i.id === t.industry)?.short} ·{" "}
                {STAGE_LABELS[t.stage]}
                <br />
                {geometryLabel(t.geometry)}
              </small>
            </button>
          ))}
        </nav>
        {current && (
          <div className={styles.adminForm}>
            <h3>{current.clientName}</h3>
            <p className={styles.adminNote}>
              The private base controls conflict checks. The public map uses
              only the separately approved display area. An ad-targeting change
              is a separate operation.
            </p>
            <div className={styles.adminFieldGrid}>
              <div>
                <label htmlFor="admin-client">
                  Client / business (private)
                </label>
                <input
                  id="admin-client"
                  maxLength={200}
                  value={current.clientName}
                  onChange={(e) => update({ clientName: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="admin-industry">Industry</label>
                <select
                  id="admin-industry"
                  value={current.industry}
                  onChange={(e) => {
                    const i = INDUSTRIES.find((v) => v.id === e.target.value)!;
                    update({ industry: i.id, services: [...i.services] });
                  }}
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="admin-stage">Stage</label>
                <select
                  id="admin-stage"
                  value={current.stage}
                  onChange={(e) => {
                    const stage = e.target.value as Territory["stage"];
                    update({
                      stage,
                      publicApproved: false,
                      expiresAt:
                        stage === "interest"
                          ? interestExpiration()
                          : stage === "held"
                            ? null
                            : null,
                    });
                  }}
                >
                  {Object.entries(STAGE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="admin-exclusive">Competing scope</label>
                <select
                  id="admin-exclusive"
                  value={current.exclusivity}
                  onChange={(e) =>
                    update({
                      exclusivity: e.target.value as Territory["exclusivity"],
                    })
                  }
                >
                  <option value="industry">
                    One client per industry in this area
                  </option>
                  <option value="services">
                    Only the named services are exclusive
                  </option>
                </select>
              </div>
            </div>
            <fieldset className="mt-5">
              <legend className="text-xs font-semibold">
                Services covered
              </legend>
              <div className={styles.serviceChecks}>
                {Object.entries(SERVICE_NAMES).map(([s, name]) => (
                  <label key={s} className={styles.check}>
                    <input
                      type="checkbox"
                      checked={current.services.includes(s)}
                      onChange={(e) =>
                        update({
                          services: e.target.checked
                            ? [...current.services, s]
                            : current.services.filter((x) => x !== s),
                        })
                      }
                    />
                    {name}
                  </label>
                ))}
              </div>
            </fieldset>
            <GeometryEditor
              prefix="private"
              value={current.geometry}
              onChange={(g) =>
                update({
                  geometry: g ?? { kind: "unknown" },
                  centerVerified: false,
                })
              }
            />
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={current.centerVerified}
                onChange={(e) => update({ centerVerified: e.target.checked })}
              />
              I verified this operating base or coverage area with the client.
            </label>
            <label htmlFor="admin-expiry">
              Expiration (UTC, for interest or temporary holds)
            </label>
            <input
              id="admin-expiry"
              type="datetime-local"
              value={current.expiresAt ? current.expiresAt.slice(0, 16) : ""}
              onChange={(e) =>
                update({
                  expiresAt: e.target.value
                    ? `${e.target.value}:00.000Z`
                    : null,
                })
              }
            />
            <label htmlFor="admin-evidence">
              Agreement / request evidence (private)
            </label>
            <textarea
              id="admin-evidence"
              value={current.evidence}
              maxLength={4000}
              onChange={(e) => update({ evidence: e.target.value })}
            />
            <label htmlFor="admin-notes">
              Operating notes and requested changes (private)
            </label>
            <textarea
              id="admin-notes"
              value={current.notes}
              maxLength={4000}
              onChange={(e) => update({ notes: e.target.value })}
            />
            {overlaps.map((c) => (
              <p className={styles.adminConflict} key={c.id}>
                {c.blocking
                  ? "Protection review required"
                  : "Other interest in this market"}
                : {c.clientName} · {STAGE_LABELS[c.stage]} ·{" "}
                {c.overlap === "review"
                  ? "boundary or base needs confirmation"
                  : "geographic overlap"}
                .{" "}
                {c.blocking
                  ? "A hold or protection cannot be saved until this is resolved."
                  : "Interest does not reserve the area."}
              </p>
            ))}
            <div className={styles.line} />
            <h3>Anonymous public display</h3>
            <p className={styles.adminNote}>
              Use an agreed broad market display, not a private home or
              operating-base pin. Public geometry is approximate and never
              determines availability. Record permission before enabling
              publication.
            </p>
            <label htmlFor="admin-region">Public market label</label>
            <input
              id="admin-region"
              placeholder="Tyler area"
              maxLength={150}
              value={current.publicRegion}
              onChange={(e) => update({ publicRegion: e.target.value })}
            />
            <GeometryEditor
              prefix="public"
              publicDisplay
              value={current.publicGeometry}
              onChange={(g) =>
                update({ publicGeometry: g, publicApproved: false })
              }
            />
            <label htmlFor="admin-public-consent">
              Publication permission and verification
            </label>
            <textarea
              id="admin-public-consent"
              value={current.publicConsent}
              maxLength={2000}
              onChange={(e) => update({ publicConsent: e.target.value })}
            />
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={current.publicApproved}
                onChange={(e) => update({ publicApproved: e.target.checked })}
              />
              Verified genuine record and approved this anonymous display for
              the public map.
            </label>
            <div className={styles.line} />
            <h3>Ad platform check</h3>
            <label htmlFor="admin-ad-radius">
              Verified live ad radius, if applicable
            </label>
            <input
              id="admin-ad-radius"
              type="number"
              min="1"
              max="500"
              value={current.adRadiusMiles ?? ""}
              onChange={(e) =>
                update({
                  adRadiusMiles: e.target.value ? Number(e.target.value) : null,
                  adTargetingVerified: false,
                })
              }
            />
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={current.adTargetingVerified}
                onChange={(e) =>
                  update({ adTargetingVerified: e.target.checked })
                }
              />
              I independently checked the live targeting in the ad account.
            </label>
            <p className={styles.adminNote}>
              <ShieldCheck size={16} className="mr-2 inline" />
              Saving here records the agreement and map display. It does not
              update Meta, spend, or campaign delivery.
            </p>
          </div>
        )}
      </div>
      <section className={styles.inquiryList}>
        <h3>Incoming area requests</h3>
        <p className={styles.adminNote}>
          New inquiries are saved privately on the droplet for review here. CRM
          handoff and follow-up are manual. They remain private until you verify
          them and approve anonymous interest. Interest expires after 30 days;
          it does not block acceptance.
        </p>
        {inquiries.length === 0 ? (
          <p className={styles.adminStatus}>
            {preview
              ? "No real intake is loaded in this local preview."
              : "No area inquiries loaded."}
          </p>
        ) : (
          inquiries.map((i) => (
            <article key={i.id}>
              <div>
                <strong>{i.document.business}</strong>
                <p>
                  {i.document.name} · {i.document.email}
                  <br />
                  {i.document.market} ·{" "}
                  {INDUSTRIES.find((v) => v.id === i.document.industry)?.name}
                  <br />
                  Public anonymous interest:{" "}
                  {i.document.publicConsent
                    ? "consented, verification pending"
                    : "not consented"}
                </p>
                {i.lead_id ? (
                  <Link href={`/admin/leads/${i.lead_id}`}>Open CRM lead</Link>
                ) : (
                  <p>Private area request saved · CRM handoff pending</p>
                )}
              </div>
              <button type="button" onClick={() => reviewInquiry(i)}>
                Review interest
              </button>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
