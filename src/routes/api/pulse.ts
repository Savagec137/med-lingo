import { createFileRoute } from "@tanstack/react-router";

type ChatMsg = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `Tu es Pulse, le tuteur IA médical de MedLingo.
Tu accompagnes des étudiants ambulanciers (DEA), IFSI et paramédicaux francophones.
Style : bref, structuré, pédagogique, français simple, exemples concrets, moyens mnémotechniques.
Format : réponses courtes (200 mots max), utilise des listes à puces quand utile.
Décompose systématiquement les termes médicaux (préfixe / radical / suffixe) quand pertinent.
Rappelle sobrement, quand la question est clinique, que tu ne remplaces pas un avis médical ni un cours officiel.
Refuse tout diagnostic personnel : oriente vers un professionnel de santé ou le 15 / 112 en cas d'urgence.`;

export const Route = createFileRoute("/api/pulse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { messages?: ChatMsg[] };
        try {
          body = (await request.json()) as { messages?: ChatMsg[] };
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
        if (messages.length === 0) return new Response("Missing messages", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI non configurée", { status: 500 });

        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages.map((m) => ({ role: m.role, content: m.content })),
              ],
            }),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            if (res.status === 429) {
              return Response.json(
                { error: "Trop de messages, réessaie dans un instant." },
                { status: 429 },
              );
            }
            if (res.status === 402) {
              return Response.json(
                { error: "Crédits IA épuisés — revenez plus tard." },
                { status: 402 },
              );
            }
            return Response.json({ error: text || "Erreur IA" }, { status: res.status });
          }
          const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
          return Response.json({ reply });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Erreur réseau" },
            { status: 500 },
          );
        }
      },
    },
  },
});
