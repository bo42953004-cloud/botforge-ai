import { CheckCircle2, CircleDashed, FileCode2, X } from "lucide-react";

import type { BotStructure } from "@/lib/bot-structure";
import { cn } from "@/lib/utils";

export function BotStructureCard({
  structure,
  onRemove,
  compact = false,
}: {
  structure: BotStructure;
  onRemove?: () => void;
  compact?: boolean;
}) {
  return (
    <div className="animate-rise w-full rounded-2xl border border-gold/40 bg-surface p-4 text-left">
      <div className="flex items-center gap-2">
        <FileCode2 className="size-4 text-gold" />
        <p className="truncate font-display text-sm tracking-wide text-gold">{structure.fileName}</p>
        <span className="ml-auto text-xs text-muted-foreground">{structure.totalBlocks} blocks</span>
        {onRemove && (
          <button onClick={onRemove} aria-label="Remove imported bot" className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </div>
      {!structure.valid && (
        <p className="mt-2 text-xs text-destructive">This file doesn't look like a valid Deriv bot XML.</p>
      )}
      {!compact && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">Bot structure</p>
            <ul className="space-y-1">
              {structure.sections.map((s) => (
                <li key={s.label} className="flex items-center gap-2 text-sm">
                  {s.found ? (
                    <CheckCircle2 className="size-3.5 text-gold" />
                  ) : (
                    <CircleDashed className="size-3.5 text-muted-foreground" />
                  )}
                  <span className={cn(!s.found && "text-muted-foreground")}>{s.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{s.found ? `${s.blocks}` : "missing"}</span>
                </li>
              ))}
            </ul>
            {structure.variables.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Variables: <span className="text-foreground">{structure.variables.join(", ")}</span>
              </p>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">Settings</p>
            {structure.settings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No trade settings found.</p>
            ) : (
              <dl className="space-y-1 text-sm">
                {structure.settings.map((s) => (
                  <div key={s.label} className="flex gap-2">
                    <dt className="shrink-0 text-muted-foreground">{s.label}:</dt>
                    <dd className="truncate">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
