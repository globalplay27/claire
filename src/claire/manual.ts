import { readFileSync } from "node:fs";

const manual = readFileSync(new URL("../../docs/INSTAGRAM_AGENT_SINGLE_FILE.md", import.meta.url), "utf8");
const voice = readFileSync(new URL("../../config/voice.md", import.meta.url), "utf8");

export function manualSection(heading: string): string {
  const section = manual.split(/^# /m).find((part) => part.split(/\r?\n/, 1)[0]?.trim() === heading);
  if (!section) throw new Error(`Missing Instagram Agent manual section: ${heading}`);
  return `# ${section.trim()}`;
}

// Customer messages must never select owner-only creation commands.
export const DM_MANUAL = [
  manualSection("INSTAGRAM AGENT — CHATGPT"),
  manualSection("/ig-dm"),
  voice
].join("\n\n");
