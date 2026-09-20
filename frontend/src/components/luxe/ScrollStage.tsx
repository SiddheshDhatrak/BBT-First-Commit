import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { HandCoins, ReceiptText, ShieldCheck } from "lucide-react";

/**
 * Landing-only pinned storytelling: Donate → Track → Audit.
 * Discrete stepping: exactly one panel is ever mounted (AnimatePresence
 * mode="wait"), so panels can never overlap mid-transition.
 * Reduced-motion: renders stacked statically.
 */
const STAGES = [
  {
    icon: HandCoins,
    step: "Step 01",
    title: "Donate to a verified campaign",
    body: "Pick a disaster and category. Payment runs on a clearly labelled simulated rail — never real money in demo.",
    stat: "3 live campaigns",
  },
  {
    icon: ReceiptText,
    step: "Step 02",
    title: "Track it to the receipt",
    body: "Follow donation → fund → NGO → program → vendor → invoice → payment in one continuous, hash-verified view.",
    stat: "End-to-end lineage",
  },
  {
    icon: ShieldCheck,
    step: "Step 03",
    title: "Auditors review the signals",
    body: "Every risk flag ships with its evidence. Signals, never verdicts — false positives close in one click.",
    stat: "Evidence on every flag",
  },
];

export function ScrollStage() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [index, setIndex] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = v < 1 / 3 ? 0 : v < 2 / 3 ? 1 : 2;
    setIndex((prev) => (prev === next ? prev : next));
  });

  if (reduced) {
    return (
      <section aria-label="How it works" className="grid gap-4 md:grid-cols-3">
        {STAGES.map((s) => (
          <div key={s.title} className="rs-card p-6">
            <p className="eyebrow">{s.step}</p>
            <h3 className="mt-2 text-[19px] font-extrabold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{s.body}</p>
          </div>
        ))}
      </section>
    );
  }

  const s = STAGES[index];

  return (
    <section ref={ref} aria-label="How it works" className="relative" style={{ height: "260vh" }}>
      <div className="sticky top-24 overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* progress rail */}
          <div className="hidden lg:block">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 max-w-sm text-[32px] font-extrabold leading-tight tracking-tight">
              Transparency you can scroll through.
            </h2>
            <div className="relative mt-6 h-48 w-[3px] overflow-hidden rounded-full" style={{ background: "var(--bg-surface-alt)" }} aria-hidden>
              <motion.div
                className="absolute inset-x-0 top-0 origin-top rounded-full"
                style={{ height: "100%", background: "var(--primary-600)", scaleY: scrollYProgress }}
              />
            </div>
            <div className="mt-4 space-y-2" aria-hidden>
              {STAGES.map((label, i) => (
                <p
                  key={label.title}
                  className="text-sm font-bold transition-opacity duration-200"
                  style={{ opacity: i === index ? 1 : 0.4 }}
                >
                  <span className="mono mr-2 text-[11px]" style={{ color: "var(--text-muted)" }}>0{i + 1}</span>
                  {label.title}
                </p>
              ))}
            </div>
            <p className="mono mt-4 text-[11px] tracking-wide" style={{ color: "var(--text-muted)" }} aria-live="polite">
              STAGE {index + 1} OF 3
            </p>
          </div>
          {/* stage card — exactly one panel mounted at a time */}
          <div className="rs-card relative min-h-[380px] overflow-hidden">
            <div className="rs-hero-grid" aria-hidden />
            <AnimatePresence mode="wait">
              <motion.div
                key={s.title}
                className="p-7 md:p-10"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                aria-live="polite"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: "var(--primary-600)" }}>
                  <s.icon size={22} aria-hidden />
                </span>
                <p className="eyebrow mt-5">{s.step}</p>
                <h3 className="mt-2 max-w-md text-[26px] font-extrabold leading-tight tracking-tight md:text-[30px]">{s.title}</h3>
                <p className="mt-3 max-w-md text-[15px] leading-7" style={{ color: "var(--text-secondary)" }}>{s.body}</p>
                <p className="mono mt-5 inline-block rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                  {s.stat.toUpperCase()}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        {/* mobile stage dots */}
        <div className="mt-4 flex justify-center gap-2 lg:hidden" aria-hidden>
          {STAGES.map((label, i) => (
            <span
              key={label.title}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{ width: i === index ? 32 : 16, background: i === index ? "var(--primary-600)" : "var(--border-strong)" }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
