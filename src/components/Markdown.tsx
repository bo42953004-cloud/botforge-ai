import { Fragment } from "react";

/** Tiny markdown renderer: headings, bullets, numbered lists, bold, inline code. */
export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim().length > 0);

  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const isBullets = lines.every((line) => /^\s*[-*]\s+/.test(line));
        const isNumbered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));

        if (isBullets) {
          return (
            <ul key={index} className="space-y-1.5 pl-1">
              {lines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-gold" />
                  <span>{inline(line.replace(/^\s*[-*]\s+/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (isNumbered) {
          return (
            <ol key={index} className="space-y-1.5">
              {lines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-sm text-gold">{i + 1}.</span>
                  <span>{inline(line.replace(/^\s*\d+[.)]\s+/, ""))}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (/^#{1,4}\s/.test(block)) {
          return (
            <h3 key={index} className="text-base text-gold">
              {inline(block.replace(/^#{1,4}\s/, ""))}
            </h3>
          );
        }
        return <p key={index}>{inline(block)}</p>;
      })}
    </div>
  );
}

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
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
