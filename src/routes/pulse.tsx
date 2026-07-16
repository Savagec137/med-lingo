import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/pulse")({
  component: PulsePage,
});

type ChatMsg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Explique-moi le bilan ABCDE",
  "Que veut dire « bradycardie » ?",
  "Étapes de la RCP adulte",
  "Décompose « péricardite »",
];

function PulsePage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Salut ! Je suis Pulse, ton tuteur IA médical. Pose-moi une question sur le vocabulaire, l'anatomie, une pathologie ou un geste — je te réponds avec des explications claires.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const next: ChatMsg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => m.role === "user" || m.role === "assistant"),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Erreur");
      } else if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply! }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-4 pt-4">
        <div className="mb-3 flex items-center gap-2 rounded-2xl border-2 border-[color:var(--color-primary)] bg-gradient-to-br from-[oklch(0.78_0.19_145)] to-[color:var(--color-primary)] p-3 text-primary-foreground shadow-[0_4px_0_0_oklch(0.55_0.17_145)]">
          <Sparkles className="h-5 w-5" />
          <div>
            <div className="font-display text-sm font-extrabold uppercase tracking-wider">
              Pulse IA
            </div>
            <div className="text-[11px] opacity-90">
              Tuteur médical — pédagogique, ne remplace pas un avis médical.
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-3"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "rounded-br-md bg-[color:var(--color-primary)] text-primary-foreground"
                    : "rounded-bl-md bg-secondary text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-2.5 text-sm">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                </span>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-[color:var(--color-primary)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose ta question à Pulse…"
            className="flex-1 rounded-full border-2 border-border bg-card px-4 py-3 text-sm font-medium outline-none focus:border-[color:var(--color-primary)]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[oklch(0.55_0.17_145)] bg-[color:var(--color-primary)] text-primary-foreground shadow-[0_4px_0_0_oklch(0.55_0.17_145)] transition active:translate-y-[2px] active:shadow-[0_2px_0_0_oklch(0.55_0.17_145)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Envoyer"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
