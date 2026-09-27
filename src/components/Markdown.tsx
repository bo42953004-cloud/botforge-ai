import { Fragment, type ReactNode } from "react";

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "h"; text: string }
  | { kind: "ul"; lines: string[] }
  | { kind: "ol"; lines: string[] };

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  const push = (block: Block) => blocks.push(block);
  let current: Block | null = null;

  const flush = () => {
    if (current) push(current);
    current = null;
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^#{1,4}\s/.test(line)) {
      flush();
      push({ kind: "h", text: line.replace(/^#{1,4}\s+/, "").replace(/[:\s]+$/, "") });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const item = line.replace(/^\s*[-*]\s+/, "");
      if (current?.kind === "ul") current.lines.push(item);
      else {
        flush();
        current = { kind: "ul", lines: [item] };
      }
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const item = line.replace(/^\s*\d+[.)]\s+/, "");
      if (current?.kind === "ol") current.lines.push(item);
      else {
        flush();
        current = { kind: "ol", lines: [item] };
      }
      continue;
    }
    if (current?.kind === "p") current.lines.push(line);
    else {
      flush();
      current = { kind: "p", lines: [line] };
    }
  }
  flush();
  return blocks;
}

/** Tiny markdown renderer: headings, bullets, numbered lists, bold, inline code. */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {parse(text).map((block, index) => {
        if (block.kind === "h") {
          return (
            <h3 key={index} className="pt-1 text-base text-gold">
              {inline(block.text)}
            </h3>
          );
        }
        if (block.kind === "ul") {
          return (
            <ul key={index} className="space-y-1.5">
              {block.lines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-gold" />
                  <span>{inline(line)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol key={index} className="space-y-1.5">
              {block.lines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-sm text-gold">{i + 1}.</span>
                  <span>{inline(line)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return <p key={index}>{inline(block.lines.join(" "))}</p>;
      })}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[13px] text-gold">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
