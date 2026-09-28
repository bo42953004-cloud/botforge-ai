import { Link, createFileRoute } from "@tanstack/react-router";
import { Download, MessagesSquare, Sparkles, Volume2 } from "lucide-react";

import { RobotHead, Typewriter } from "@/components/RobotHead";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aureus — Describe it, download your Deriv bot XML" },
      {
        name: "description",
        content:
          "Aureus is a gold-robot AI engineer that turns plain-language trading ideas into downloadable Deriv Bot XML files you can load straight into Deriv Bot.",
      },
      { property: "og:title", content: "Aureus — AI Deriv Bot XML Builder" },
      {
        property: "og:description",
        content: "Describe your strategy. Aureus asks the right questions and writes the Deriv bot XML.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "It asks before it builds",
    body: "Market, trade type, duration, stake, martingale, stop loss — Aureus asks whatever you left out, then builds.",
  },
  {
    icon: Sparkles,
    title: "Real Deriv blocks",
    body: "Valid Blockly workspaces with trade definition, purchase, sell and after-purchase logic wired correctly.",
  },
  {
    icon: Download,
    title: "Download the .xml",
    body: "Save the file to a folder and load it in Deriv Bot, or open it in your browser to inspect the blocks.",
  },
  {
    icon: Volume2,
    title: "Live coding sounds",
    body: "Mechanical key clicks while the robot writes, and a chime the moment your bot file is ready.",
  },
];

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gold/5 blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <span className="font-display text-lg tracking-[0.3em] text-gold-gradient">AUREUS</span>
        <Button asChild variant="outline" size="sm">
          <Link to="/studio">Open studio</Link>
        </Button>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-rise">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-gold">
            AI Deriv bot engineer
          </p>
          <h1 className="text-4xl leading-tight sm:text-6xl">
            Describe the bot.
            <br />
            <span className="text-gold-gradient">Download the XML.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Tell Aureus what your Deriv bot should do — it fills the gaps with smart questions, writes the
            Blockly XML live, and hands you a file you can save and load into Deriv Bot.
          </p>
          <div className="mt-6 h-7 text-base">
            <Typewriter
              words={[
                "digit differs on R_100, stake 0.35, martingale 2.1x…",
                "rise/fall on Volatility 75 after 3 red ticks…",
                "even/odd with take profit 10 and stop loss 20…",
              ]}
            />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/studio">Build my first bot</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Always test generated bots on a Deriv demo account first. Trading involves risk.
          </p>
        </div>

        <div className="flex justify-center">
          <RobotHead state="listening" size="xl" showStatus={false} />
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-4 px-5 pb-20 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="panel rounded-2xl p-5 transition-colors hover:border-gold/40"
          >
            <feature.icon className="mb-3 size-5 text-gold" />
            <h3 className="text-base">{feature.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
