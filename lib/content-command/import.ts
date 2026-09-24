import "server-only";

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CONTENT_PLATFORMS,
  type ContentPlatform,
  type ImportedArtifact,
  type ImportedUnit,
} from "./types";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function optionalText(value: unknown, max: number) {
  const valueText = text(value, max);
  return valueText || null;
}

export function validateImportedArtifact(input: unknown): ImportedArtifact {
  if (!input || typeof input !== "object") throw new Error("Artifact JSON is required.");
  const value = input as Record<string, unknown>;
  const artifactDate = text(value.artifact_date, 10);
  const title = text(value.title, 240);
  if (!ISO_DAY.test(artifactDate)) throw new Error("artifact_date must use YYYY-MM-DD.");
  if (!title) throw new Error("The artifact needs a title.");
  if (!Array.isArray(value.units) || value.units.length !== 10) {
    throw new Error("A LeadFlow daily artifact must contain exactly 10 units.");
  }

  const positions = new Set<number>();
  const units = value.units.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error(`Unit ${index + 1} is invalid.`);
    const unit = raw as Record<string, unknown>;
    const position = Number(unit.position ?? index + 1);
    if (!Number.isInteger(position) || position < 1 || position > 100 || positions.has(position)) {
      throw new Error(`Unit ${index + 1} has an invalid or duplicate position.`);
    }
    positions.add(position);
    const unitTitle = text(unit.title, 240);
    if (!unitTitle) throw new Error(`Unit ${position} needs a title.`);
    if (!Array.isArray(unit.variants)) throw new Error(`Unit ${position} needs platform variants.`);

    const variants = unit.variants.map((rawVariant) => {
      const variant = (rawVariant ?? {}) as Record<string, unknown>;
      const platform = text(variant.platform, 20) as ContentPlatform;
      if (!CONTENT_PLATFORMS.includes(platform)) {
        throw new Error(`Unit ${position} has an unsupported platform.`);
      }
      const copy = text(variant.copy, 30000);
      const description = optionalText(variant.description, 12000);
      if (!copy && !description) throw new Error(`Unit ${position} ${platform} copy is empty.`);
      return {
        platform,
        copy,
        format: optionalText(variant.format, 160),
        title: optionalText(variant.title, 500),
        description,
        hook: optionalText(variant.hook, 1000),
        talking_points: Array.isArray(variant.talking_points)
          ? variant.talking_points.map((point) => text(point, 1000)).filter(Boolean).slice(0, 20)
          : [],
        scheduled_for: variant.scheduled_for ? new Date(String(variant.scheduled_for)).toISOString() : null,
      };
    });
    const platformSet = new Set(variants.map((variant) => variant.platform));
    for (const platform of CONTENT_PLATFORMS) {
      if (!platformSet.has(platform)) throw new Error(`Unit ${position} is missing ${platform}.`);
    }
    if (platformSet.size !== CONTENT_PLATFORMS.length || variants.length !== CONTENT_PLATFORMS.length) {
      throw new Error(`Unit ${position} must contain one variant for each platform.`);
    }

    return {
      position,
      title: unitTitle,
      content_type: text(unit.content_type || "text-led", 120),
      content_bucket: optionalText(unit.content_bucket, 160),
      target_persona: optionalText(unit.target_persona, 500),
      objective: optionalText(unit.objective, 1000),
      cta: optionalText(unit.cta, 1000),
      asset_direction: optionalText(unit.asset_direction, 3000),
      asset_url: optionalText(unit.asset_url, 3000),
      verified_url: optionalText(unit.verified_url, 3000),
      variants,
    } satisfies ImportedUnit;
  });

  return {
    artifact_date: artifactDate,
    title,
    timezone: text(value.timezone || "America/Chicago", 100),
    notion_page_id: optionalText(value.notion_page_id, 200),
    notion_page_url: optionalText(value.notion_page_url, 3000),
    source: (["notion", "automation", "manual", "api"] as const).includes(value.source as any)
      ? (value.source as ImportedArtifact["source"])
      : "api",
    channel_blockers:
      value.channel_blockers && typeof value.channel_blockers === "object"
        ? (value.channel_blockers as Record<string, string>)
        : {},
    verification:
      value.verification && typeof value.verification === "object"
        ? (value.verification as Record<string, unknown>)
        : {},
    units,
  };
}

export async function upsertContentArtifact(
  sb: SupabaseClient<any>,
  input: unknown,
  actorId?: string | null,
) {
  const artifact = validateImportedArtifact(input);
  const sourceHash = createHash("sha256").update(JSON.stringify(artifact)).digest("hex");
  const { data: savedArtifact, error: artifactError } = await sb
    .from("content_artifacts")
    .upsert(
      {
        artifact_date: artifact.artifact_date,
        title: artifact.title,
        status: "draft",
        timezone: artifact.timezone,
        notion_page_id: artifact.notion_page_id,
        notion_page_url: artifact.notion_page_url,
        source: artifact.source,
        source_hash: sourceHash,
        unit_count: artifact.units.length,
        channel_blockers: artifact.channel_blockers,
        verification: artifact.verification,
        raw_source: { schema: "leadflow-content-artifact-v1" },
        last_synced_at: new Date().toISOString(),
        created_by: actorId ?? null,
      },
      { onConflict: "artifact_date" },
    )
    .select("id")
    .single();
  if (artifactError || !savedArtifact) throw new Error(artifactError?.message || "Could not save artifact.");

  const artifactId = savedArtifact.id as string;
  for (const unit of artifact.units) {
    const { data: savedUnit, error: unitError } = await sb
      .from("content_units")
      .upsert(
        {
          artifact_id: artifactId,
          position: unit.position,
          title: unit.title,
          content_type: unit.content_type,
          content_bucket: unit.content_bucket,
          target_persona: unit.target_persona,
          objective: unit.objective,
          cta: unit.cta,
          asset_direction: unit.asset_direction,
          asset_url: unit.asset_url,
          verified_url: unit.verified_url,
        },
        { onConflict: "artifact_id,position" },
      )
      .select("id")
      .single();
    if (unitError || !savedUnit) throw new Error(unitError?.message || `Could not save unit ${unit.position}.`);

    const unitId = savedUnit.id as string;
    const { data: existing } = await sb
      .from("content_variants")
      .select("platform,status")
      .eq("unit_id", unitId);
    const statusByPlatform = new Map<string, string>(
      (existing ?? []).map((row) => [row.platform, row.status]),
    );
    const editable = new Set(["draft", "blocked", "failed"]);
    const rows = unit.variants
      .filter((variant) => !statusByPlatform.has(variant.platform) || editable.has(statusByPlatform.get(variant.platform)!))
      .map((variant) => ({
        unit_id: unitId,
        ...variant,
        timezone: artifact.timezone,
        status: "draft",
        last_error: null,
      }));
    if (rows.length) {
      const { error: variantsError } = await sb
        .from("content_variants")
        .upsert(rows, { onConflict: "unit_id,platform" });
      if (variantsError) throw new Error(variantsError.message);
    }
  }

  await sb.from("content_activity_events").insert({
    kind: "artifact.synced",
    entity_type: "artifact",
    entity_id: artifactId,
    summary: `${artifact.title} synced with ${artifact.units.length} units and 50 platform variants.`,
    actor_id: actorId ?? null,
    details: { artifact_date: artifact.artifact_date, source: artifact.source, source_hash: sourceHash },
  });

  return { artifactId, sourceHash, unitCount: artifact.units.length, variantCount: 50 };
}
