import { leadKeywords } from "../config/env.js";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectLeadKeyword(text: string): string | null {
  const normalizedText = ` ${normalize(text)} `;

  for (const keyword of leadKeywords) {
    const normalizedKeyword = normalize(keyword);
    if (normalizedKeyword && normalizedText.includes(` ${normalizedKeyword} `)) {
      return keyword;
    }
  }

  return null;
}
