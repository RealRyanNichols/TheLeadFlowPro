import {
  FACEBOOK_GRAPH_VERSION,
  type SocialMediaType,
  validateMetaSchedule,
} from "./social";

type MetaErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export class MetaPublishingError extends Error {
  httpStatus: number | null;
  code: string | null;
  subcode: string | null;
  traceId: string | null;

  constructor(
    message: string,
    details: {
      httpStatus?: number | null;
      code?: string | null;
      subcode?: string | null;
      traceId?: string | null;
    } = {},
  ) {
    super(message);
    this.name = "MetaPublishingError";
    this.httpStatus = details.httpStatus ?? null;
    this.code = details.code ?? null;
    this.subcode = details.subcode ?? null;
    this.traceId = details.traceId ?? null;
  }
}

export type FacebookPublishInput = {
  pageId: string;
  sourceToken: string;
  message: string;
  mediaType: SocialMediaType;
  mediaUrl?: string | null;
  linkUrl?: string | null;
  scheduledFor?: string | null;
  now?: Date;
};

export type FacebookPublishResult = {
  mode: "publish" | "schedule";
  objectId: string | null;
  postId: string | null;
  permalink: string | null;
  httpStatus: number;
};

export type MetaConnectionHealth = {
  pageId: string;
  pageName: string | null;
  graphVersion: string;
  permissions: string[];
  pageTasks: string[];
  canPublish: boolean;
  sourceKind: "page_token" | "system_or_user_token";
};

export function canPublishWithFacebookAccess(
  permissions: string[],
  pageTasks: string[],
) {
  return (
    permissions.includes("pages_manage_posts") ||
    pageTasks.some((task) => ["CREATE_CONTENT", "MANAGE"].includes(task))
  );
}

type MetaFetchResult<T> = { response: Response; body: T & MetaErrorBody };

const graphVersion = process.env.META_GRAPH_VERSION || FACEBOOK_GRAPH_VERSION;
const graphBase = `https://graph.facebook.com/${graphVersion}`;

async function metaFetchJson<T>(path: string, init?: RequestInit): Promise<MetaFetchResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${graphBase}/${path.replace(/^\//, "")}`, init);
  } catch (error) {
    throw new MetaPublishingError(`Could not reach Meta: ${String(error).slice(0, 300)}`);
  }

  const body = (await response.json().catch(() => ({}))) as T & MetaErrorBody;
  if (!response.ok || body.error) {
    const e = body.error;
    throw new MetaPublishingError(e?.message || `Meta returned HTTP ${response.status}.`, {
      httpStatus: response.status,
      code: e?.code == null ? null : String(e.code),
      subcode: e?.error_subcode == null ? null : String(e.error_subcode),
      traceId: e?.fbtrace_id ?? null,
    });
  }
  return { response, body };
}

async function readGraph<T>(path: string, token: string): Promise<T> {
  const result = await metaFetchJson<T>(path, {
    method: "GET",
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  return result.body;
}

export async function resolveFacebookPageToken(
  sourceToken: string,
  pageId: string,
): Promise<{ token: string; sourceKind: MetaConnectionHealth["sourceKind"] }> {
  if (!sourceToken || sourceToken.length < 20) {
    throw new MetaPublishingError("META_PAGE_ACCESS_TOKEN is not configured.");
  }

  try {
    const page = await readGraph<{ id?: string; access_token?: string }>(
      `${pageId}?fields=id,access_token`,
      sourceToken,
    );
    if (page.id === pageId && page.access_token) {
      return { token: page.access_token, sourceKind: "system_or_user_token" };
    }
    if (page.id === pageId) return { token: sourceToken, sourceKind: "page_token" };
  } catch {
    // Some system-user token configurations expose the Page only through
    // /me/accounts. Try that official exchange before returning the real error.
  }

  try {
    const accounts = await readGraph<{
      data?: { id?: string; access_token?: string }[];
    }>("me/accounts?fields=id,access_token&limit=100", sourceToken);
    const page = (accounts.data ?? []).find((item) => item.id === pageId);
    if (page?.access_token) {
      return { token: page.access_token, sourceKind: "system_or_user_token" };
    }
  } catch {
    // The final read below produces the clearest permission error from Meta.
  }

  await readGraph<{ id?: string }>(`${pageId}?fields=id`, sourceToken);
  return { token: sourceToken, sourceKind: "page_token" };
}

export async function inspectFacebookConnection(
  sourceToken: string,
  pageId: string,
): Promise<MetaConnectionHealth> {
  const resolved = await resolveFacebookPageToken(sourceToken, pageId);
  const page = await readGraph<{ id?: string; name?: string }>(
    `${pageId}?fields=id,name`,
    resolved.token,
  );
  if (page.id !== pageId) {
    throw new MetaPublishingError("The token resolved to a different Facebook Page.");
  }

  let permissions: string[] = [];
  try {
    const result = await readGraph<{
      data?: { permission?: string; status?: string }[];
    }>("me/permissions", sourceToken);
    permissions = (result.data ?? [])
      .filter((item) => item.status === "granted" && item.permission)
      .map((item) => item.permission as string);
  } catch {
    permissions = [];
  }

  const pageTasks = new Set<string>();
  try {
    const result = await readGraph<{
      data?: { id?: string; tasks?: string[] }[];
    }>("me/accounts?fields=id,tasks&limit=100", sourceToken);
    for (const task of (result.data ?? []).find((item) => item.id === pageId)?.tasks ?? []) {
      pageTasks.add(task);
    }
  } catch {
    // System-user tokens can expose Page tasks on the Page node instead.
  }

  for (const token of new Set([sourceToken, resolved.token])) {
    try {
      const result = await readGraph<{ id?: string; tasks?: string[] }>(
        `${pageId}?fields=id,tasks`,
        token,
      );
      if (result.id === pageId) {
        for (const task of result.tasks ?? []) pageTasks.add(task);
      }
    } catch {
      // Not every Page-token shape exposes tasks. Permission names can still
      // confirm publishing access without making a test post.
    }
  }

  const taskList = [...pageTasks];
  const canPublish = canPublishWithFacebookAccess(permissions, taskList);

  return {
    pageId,
    pageName: page.name ?? null,
    graphVersion,
    permissions,
    pageTasks: taskList,
    canPublish,
    sourceKind: resolved.sourceKind,
  };
}

export function buildFacebookPublishRequest(
  input: Omit<FacebookPublishInput, "sourceToken">,
): { endpoint: "feed" | "photos" | "videos"; params: URLSearchParams; mode: "publish" | "schedule" } {
  const schedule = validateMetaSchedule(input.scheduledFor ?? null, input.now ?? new Date());
  if (schedule.error) throw new MetaPublishingError(schedule.error);

  const params = new URLSearchParams();
  let endpoint: "feed" | "photos" | "videos";
  if (input.mediaType === "photo") {
    endpoint = "photos";
    params.set("url", input.mediaUrl || "");
    params.set("caption", input.message);
  } else if (input.mediaType === "video") {
    endpoint = "videos";
    params.set("file_url", input.mediaUrl || "");
    params.set("description", input.message);
  } else {
    endpoint = "feed";
    params.set("message", input.message);
    if (input.mediaType === "link" && input.linkUrl) params.set("link", input.linkUrl);
  }

  if (schedule.mode === "schedule") {
    params.set("published", "false");
    params.set("scheduled_publish_time", String(schedule.unixTime));
    params.set("unpublished_content_type", "SCHEDULED");
  } else {
    params.set("published", "true");
  }

  return { endpoint, params, mode: schedule.mode };
}

export async function publishFacebookPost(
  input: FacebookPublishInput,
): Promise<FacebookPublishResult> {
  const resolved = await resolveFacebookPageToken(input.sourceToken, input.pageId);
  const built = buildFacebookPublishRequest(input);

  const { response, body } = await metaFetchJson<{
    id?: string;
    post_id?: string;
  }>(`${input.pageId}/${built.endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolved.token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: built.params.toString(),
  });

  const objectId = body.id ?? null;
  const postId = body.post_id ?? (built.endpoint === "feed" ? body.id ?? null : null);
  let permalink: string | null = null;
  if (postId && built.mode === "publish") {
    try {
      const post = await readGraph<{ permalink_url?: string }>(
        `${postId}?fields=permalink_url`,
        resolved.token,
      );
      permalink = post.permalink_url ?? null;
    } catch {
      permalink = null;
    }
  }

  return {
    mode: built.mode,
    objectId,
    postId,
    permalink,
    httpStatus: response.status,
  };
}

export async function cancelFacebookPost(input: {
  pageId: string;
  sourceToken: string;
  metaId: string;
}): Promise<{ httpStatus: number; success: boolean }> {
  const resolved = await resolveFacebookPageToken(input.sourceToken, input.pageId);
  const result = await metaFetchJson<{ success?: boolean }>(input.metaId, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${resolved.token}` },
  });
  return { httpStatus: result.response.status, success: result.body.success !== false };
}

export function metaErrorDetails(error: unknown) {
  if (error instanceof MetaPublishingError) {
    return {
      message: error.message.slice(0, 3000),
      httpStatus: error.httpStatus,
      code: error.code,
      subcode: error.subcode,
      traceId: error.traceId,
    };
  }
  return {
    message: String(error).slice(0, 3000),
    httpStatus: null,
    code: null,
    subcode: null,
    traceId: null,
  };
}
