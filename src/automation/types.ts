export type AutomationAgent =
  | "planner"
  | "creator"
  | "publisher"
  | "engagement"
  | "auditor";

export type ContentKind = "image";

export type ContentJob = {
  id: string;
  kind: ContentKind;
  status: "draft" | "ready" | "publishing" | "published" | "failed";
  topic: string;
  objective: string;
  caption: string | null;
  imagePrompt: string | null;
  imageMimeType: string | null;
  scheduledFor: Date | null;
  publishedMediaId: string | null;
  error: string | null;
};
