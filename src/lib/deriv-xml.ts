export type BotArtifact = {
  xml: string;
  fileName: string;
};

const FENCE = /```(?:xml|XML)?\s*([\s\S]*?)(?:```|$)/g;

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "deriv-bot"
  );
}

/** Pull every complete Deriv XML document out of an assistant message. */
export function extractBots(text: string): BotArtifact[] {
  const bots: BotArtifact[] = [];
  const nameMatch = text.match(/File:\s*([\w. -]+\.xml)/i);
  const baseName = nameMatch?.[1]?.trim();

  FENCE.lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = FENCE.exec(text)) !== null) {
    const raw = (match[1] ?? "").trim();
    if (!raw.startsWith("<xml")) continue;
    if (!raw.includes("</xml>")) continue; // still streaming
    index += 1;
    const fileName = baseName
      ? index === 1
        ? baseName
        : baseName.replace(/\.xml$/i, `-${index}.xml`)
      : `${slugify(text.slice(0, 60))}-${index}.xml`;
    bots.push({ xml: raw, fileName });
  }
  return bots;
}

/** True while a fenced xml block has started but has not closed yet. */
export function hasOpenXmlBlock(text: string) {
  const opens = text.match(/```(?:xml|XML)/g)?.length ?? 0;
  const closed = extractBots(text).length;
  return opens > closed;
}

export function downloadXml(bot: BotArtifact) {
  const blob = new Blob([bot.xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = bot.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Text with fenced xml blocks removed, so prose renders separately. */
export function stripXmlBlocks(text: string) {
  return text
    .replace(/```(?:xml|XML)[\s\S]*?```/g, "")
    .replace(/```(?:xml|XML)[\s\S]*$/g, "")
    .replace(/File:\s*[\w. -]+\.xml/gi, "")
    .trim();
}
