import { useCallback, useEffect } from "react";
import { useUI, type Theme } from "@/lib/store";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type VTDoc = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

export function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem("rahatsetu_theme", t);
  } catch { /* private mode */ }
}

function unlock() {
  document.documentElement.style.removeProperty("pointer-events");
}

/** Gliding wave theme toggle — PRD §7. VT primary + CSS fallback + reduced-motion crossfade. */
export function useThemeToggle() {
  const { theme, setTheme } = useUI();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(
    (originX?: number, originY?: number) => {
      const next: Theme = theme === "light" ? "dark" : "light";
      const reduced = prefersReducedMotion();
      const x = originX ?? window.innerWidth - 40;
      const y = originY ?? 40;

      if (reduced || !(document as VTDoc).startViewTransition) {
        setTheme(next);
        return;
      }

      try {
        document.documentElement.style.setProperty("pointer-events", "none");
        const transition = (document as VTDoc).startViewTransition!(() => {
          applyTheme(next);
          setTheme(next);
        });

        const maxR = Math.hypot(window.innerWidth, window.innerHeight) * 1.1;
        transition.ready
          .then(() => {
            // 2-crest wave: layered circles approximate an undulating edge
            const anim = document.documentElement.animate(
              [
                { clipPath: `circle(0px at ${x}px ${y}px)` },
                { clipPath: `circle(${maxR * 0.55}px at ${x}px ${y}px)` },
                { clipPath: `circle(${maxR}px at ${x}px ${y}px)` },
              ],
              {
                duration: 700,
                easing: "cubic-bezier(.65,0,.35,1)",
                pseudoElement: "::view-transition-new(root)",
              } as KeyframeAnimationOptions,
            );
            return anim.finished.catch(() => undefined);
          })
          .catch(() => undefined)
          .finally(unlock);
        transition.finished.catch(() => undefined).finally(() => setTimeout(unlock, 750));
      } catch {
        setTheme(next);
        unlock();
      }
    },
    [theme, setTheme],
  );

  return { theme, toggle };
}
