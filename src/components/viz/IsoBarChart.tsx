import { useState } from "react";
import { motion } from "motion/react";

export interface IsoBarDatum {
  name: string;
  value: number;
  color: string;
}

const W = 620;
const H = 340;
const ML = 72; // left margin for y labels
const MR = 28;
const MT = 20;
const MB = 36;
const DX = 16; // iso depth x
const DY = -12; // iso depth y

/** Round max up to a 1/2/2.5/5 × 10^n nice number. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const n = v / base;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * base;
}

function shade(hex: string, amt: number): string {
  // amt -1..1: darken/lighten a #rrggbb color
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => {
    const v = amt >= 0 ? c + (255 - c) * amt : c * (1 + amt);
    return Math.round(Math.max(0, Math.min(255, v)));
  };
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Dependency-free isometric 3D bar chart (SVG).
 * Front + top + side faces, hover/focus glass tooltip, grow-in animation.
 * Pair with a data-table fallback for accessibility (done by callers).
 */
export function IsoBarChart({
  data,
  formatTick,
  formatExact,
  ariaLabel,
}: {
  data: IsoBarDatum[];
  formatTick: (v: number) => string;
  formatExact: (v: number) => string;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const maxV = Math.max(0, ...data.map((d) => d.value));
  const top = niceCeil(maxV);
  const plotW = W - ML - MR;
  const plotH = H - MT - MB;
  const y = (v: number) => MT + plotH - (v / top) * plotH;
  const ticks = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);

  const slot = plotW / data.length;
  const barW = Math.min(72, slot * 0.42);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={ariaLabel}
      style={{ overflow: "visible" }}
    >
      {/* gridlines + y labels */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={ML}
            x2={W - MR + DX}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--border-subtle)"
            strokeDasharray={t === 0 ? undefined : "4 4"}
            strokeWidth={1}
          />
          <text
            x={ML - 10}
            y={y(t) + 4}
            textAnchor="end"
            fontSize="11.5"
            fontWeight="600"
            fill="var(--text-muted)"
            fontFamily="Manrope, sans-serif"
          >
            {formatTick(t)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const cx = ML + slot * i + slot / 2;
        const x = cx - barW / 2;
        const yTop = y(d.value);
        const base = y(0);
        const h = Math.max(2, base - yTop);
        const active = hover === i;
        const topPts = `${x},${yTop} ${x + DX},${yTop + DY} ${x + barW + DX},${yTop + DY} ${x + barW},${yTop}`;
        const sidePts = `${x + barW},${yTop} ${x + barW + DX},${yTop + DY} ${x + barW + DX},${base + DY} ${x + barW},${base}`;
        return (
          <motion.g
            key={d.name}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.8, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%", filter: active ? "brightness(1.08)" : undefined }}
            tabIndex={0}
            role="button"
            aria-label={`${d.name}: ${formatExact(d.value)}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <title>{`${d.name}: ${formatExact(d.value)}`}</title>
            {/* ground shadow */}
            <ellipse cx={cx + DX / 2} cy={base + 8} rx={barW * 0.72} ry={7} fill="var(--text-primary)" opacity={0.1} />
            {/* side face (darker) */}
            <polygon points={sidePts} fill={shade(d.color, -0.28)} />
            {/* front face */}
            <rect x={x} y={yTop} width={barW} height={h} rx={7} fill={d.color} />
            {/* top face (lighter) */}
            <polygon points={topPts} fill={shade(d.color, 0.32)} stroke={shade(d.color, 0.45)} strokeWidth={1} />
            {/* x label */}
            <text
              x={cx + DX / 2}
              y={H - 12}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight="800"
              fill="var(--text-secondary)"
              fontFamily="Manrope, sans-serif"
            >
              {d.name}
            </text>
          </motion.g>
        );
      })}

      {/* hover tooltip */}
      {hover !== null && data[hover] && (
        <g pointerEvents="none">
          {(() => {
            const d = data[hover];
            const cx = ML + slot * hover + slot / 2;
            const ty = Math.max(54, y(d.value) - 72);
            const tx = Math.min(Math.max(cx, 108), W - 108);
            return (
              <g>
                <rect
                  x={tx - 96}
                  y={ty}
                  width={192}
                  height={56}
                  rx={12}
                  fill="var(--bg-surface)"
                  stroke="var(--border-subtle)"
                  style={{ filter: "drop-shadow(0 10px 24px rgba(15,27,45,.18))" }}
                />
                <text x={tx} y={ty + 22} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-secondary)" fontFamily="Manrope, sans-serif">
                  {d.name}
                </text>
                <text x={tx} y={ty + 42} textAnchor="middle" fontSize="13.5" fontWeight="800" fill="var(--text-primary)" fontFamily="Manrope, sans-serif">
                  Amount: {formatExact(d.value)}
                </text>
              </g>
            );
          })()}
        </g>
      )}
    </svg>
  );
}
