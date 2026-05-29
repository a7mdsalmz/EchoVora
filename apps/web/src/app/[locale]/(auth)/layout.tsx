import { LanguageToggle } from "@/components/LanguageToggle";
import { AudioWaveform } from "lucide-react";

export default async function AuthLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const raw = (await params).locale;
  const locale = raw === "ar" ? "ar" : "en";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(1200px 700px at 20% 10%, rgba(124,58,237,.25), transparent 60%), radial-gradient(900px 600px at 90% 20%, rgba(34,211,238,.22), transparent 55%), radial-gradient(800px 500px at 50% 100%, rgba(99,166,255,.18), transparent 55%), var(--background)"
      }}
    >
      <div className={locale === "ar" ? "absolute top-4 left-4" : "absolute top-4 right-4"}>
        <LanguageToggle locale={locale} />
      </div>

      <div className="w-full max-w-md rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-[14px]"
            style={{
              background:
                "radial-gradient(80% 80% at 30% 20%, rgba(124,58,237,.7) 0%, transparent 60%), radial-gradient(70% 70% at 70% 70%, rgba(34,211,238,.6) 0%, transparent 55%), rgba(11,15,22,.85)"
            }}
          >
            <AudioWaveform className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">EchoVora</div>
            <div className="text-xs text-[color:var(--muted)]">Graphite × Purple × Cyan</div>
          </div>
        </div>

        <div className="my-5 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(34,211,238,.45), rgba(99,166,255,.35), rgba(124,58,237,.35), transparent)" }} />
        {children}
      </div>
    </div>
  );
}

