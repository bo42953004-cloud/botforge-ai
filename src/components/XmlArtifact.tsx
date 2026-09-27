import { Check, Copy, Download, FileCode2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { downloadXml, type BotArtifact } from "@/lib/deriv-xml";
import { playComplete, playKey } from "@/lib/sounds";

export function XmlArtifact({ bot }: { bot: BotArtifact }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const lines = bot.xml.split("\n").length;

  const copy = async () => {
    await navigator.clipboard.writeText(bot.xml);
    setCopied(true);
    playKey();
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-gold/35 bg-background/70 animate-rise">
      <div className="flex flex-wrap items-center gap-2 border-b border-gold/20 bg-surface-raised px-3 py-2">
        <FileCode2 className="size-4 text-gold" />
        <span className="font-mono text-sm text-foreground">{bot.fileName}</span>
        <span className="text-xs text-muted-foreground">{lines} lines</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "View"}
          </Button>
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              downloadXml(bot);
              playComplete();
              toast.success(`${bot.fileName} downloaded — load it in Deriv Bot.`);
            }}
          >
            <Download />
            Download
          </Button>
        </div>
      </div>
      {open && (
        <pre className="max-h-96 overflow-auto bg-background p-3 font-mono text-xs leading-relaxed text-muted-foreground">
          {bot.xml}
        </pre>
      )}
    </div>
  );
}
