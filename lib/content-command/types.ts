export const CONTENT_PLATFORMS = [
  "facebook",
  "x",
  "instagram",
  "youtube",
  "tiktok",
] as const;

export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number];

export type ContentArtifact = {
  id: string;
  artifact_date: string;
  title: string;
  status: string;
  timezone: string;
  notion_page_url: string | null;
  unit_count: number;
  channel_blockers: Record<string, string>;
  verification: Record<string, unknown>;
  last_synced_at: string | null;
  created_at: string;
};

export type ContentUnit = {
  id: string;
  artifact_id: string;
  position: number;
  title: string;
  content_type: string;
  content_bucket: string | null;
  target_persona: string | null;
  objective: string | null;
  cta: string | null;
  asset_direction: string | null;
  asset_url: string | null;
  verified_url: string | null;
  status: string;
};

export type ContentVariant = {
  id: string;
  unit_id: string;
  platform: ContentPlatform;
  format: string | null;
  title: string | null;
  copy: string;
  description: string | null;
  hook: string | null;
  talking_points: string[];
  scheduled_for: string | null;
  timezone: string;
  status: string;
  external_url: string | null;
  last_error: string | null;
};

export type ChannelConnection = {
  id: string;
  platform: ContentPlatform;
  status: string;
  display_name: string | null;
  capabilities: string[];
  last_verified_at: string | null;
  last_error: string | null;
};

export type ReplyTemplate = {
  id: string;
  title: string;
  kind: "comment" | "dm" | "review" | "message";
  platform: ContentPlatform | null;
  category: string;
  body: string;
  variables: string[];
  is_active: boolean;
};

export type ContentThread = {
  id: string;
  platform: ContentPlatform;
  thread_type: "comment" | "dm" | "review" | "mention";
  external_thread_id: string;
  external_url: string | null;
  subject: string | null;
  author_name: string | null;
  author_handle: string | null;
  status: string;
  unread_count: number;
  last_message_at: string | null;
};

export type ContentMessage = {
  id: string;
  thread_id: string;
  direction: "inbound" | "outbound";
  body: string;
  author_name: string | null;
  status: string;
  created_at: string;
  last_error: string | null;
};

export type ActivityEvent = {
  id: number;
  kind: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  created_at: string;
};

export type ContentCommandState = {
  ready: boolean;
  schemaError?: string;
  artifacts: ContentArtifact[];
  activeArtifactId: string | null;
  units: ContentUnit[];
  variants: ContentVariant[];
  connections: ChannelConnection[];
  templates: ReplyTemplate[];
  threads: ContentThread[];
  messages: ContentMessage[];
  activity: ActivityEvent[];
};

export type ImportedVariant = {
  platform: ContentPlatform;
  copy: string;
  format?: string | null;
  title?: string | null;
  description?: string | null;
  hook?: string | null;
  talking_points?: string[];
  scheduled_for?: string | null;
};

export type ImportedUnit = {
  position: number;
  title: string;
  content_type?: string;
  content_bucket?: string | null;
  target_persona?: string | null;
  objective?: string | null;
  cta?: string | null;
  asset_direction?: string | null;
  asset_url?: string | null;
  verified_url?: string | null;
  variants: ImportedVariant[];
};

export type ImportedArtifact = {
  artifact_date: string;
  title: string;
  timezone?: string;
  notion_page_id?: string | null;
  notion_page_url?: string | null;
  source?: "notion" | "automation" | "manual" | "api";
  channel_blockers?: Record<string, string>;
  verification?: Record<string, unknown>;
  units: ImportedUnit[];
};
