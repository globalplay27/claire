import sharp from "sharp";

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapText(text: string, maxChars: number, maxLines: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) current = next;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]!.replace(/[.…]+$/g, "")}…`;
  return kept;
}

function tspans(lines: string[], x: number, lineHeight: number) {
  return lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("");
}

export async function renderGlobalPlayCreative(baseImage: Buffer, headline: string, subheadline: string) {
  const headlineLines = wrapText(headline.toUpperCase(), 18, 2);
  const subLines = wrapText(subheadline, 32, 2);
  const svg = `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#05070d" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#05070d" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bottomShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#05070d" stop-opacity="0"/>
      <stop offset="100%" stop-color="#05070d" stop-opacity="0.94"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#b9c6d8"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.75"/>
    </filter>
  </defs>
  <rect width="1080" height="430" fill="url(#topShade)"/>
  <rect y="870" width="1080" height="480" fill="url(#bottomShade)"/>
  <rect x="58" y="54" width="260" height="62" rx="31" fill="#080b12" fill-opacity="0.82" stroke="#e31d2b" stroke-width="2"/>
  <text x="188" y="95" text-anchor="middle" font-family="DejaVu Sans,sans-serif" font-size="30" font-weight="800" letter-spacing="2" fill="url(#metal)">GLOBAL PLAY</text>
  <text x="58" y="190" font-family="DejaVu Sans,sans-serif" font-size="64" font-weight="900" fill="#ffffff" stroke="#05070d" stroke-width="2" paint-order="stroke" filter="url(#shadow)">${tspans(headlineLines, 58, 72)}</text>
  <rect x="58" y="1015" width="18" height="122" rx="9" fill="#e31d2b"/>
  <text x="100" y="1056" font-family="DejaVu Sans,sans-serif" font-size="34" font-weight="700" fill="#ffffff" filter="url(#shadow)">${tspans(subLines, 100, 44)}</text>
  <rect x="58" y="1192" width="964" height="104" rx="24" fill="#e31d2b" stroke="#ff4a55" stroke-width="2"/>
  <text x="540" y="1258" text-anchor="middle" font-family="DejaVu Sans,sans-serif" font-size="40" font-weight="900" letter-spacing="1" fill="#ffffff">ACESSE GLOBALPLAY.FUN</text>
</svg>`;

  return sharp(baseImage)
    .resize(1080, 1350, { fit: "cover", position: "centre" })
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
