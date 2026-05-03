import type { DailyScan } from "@/types";

interface Props {
  data: DailyScan[];
}

const W = 600;
const H = 200;
const PAD = { top: 16, right: 8, bottom: 24, left: 28 };

export function DailyScansChart({ data }: Props) {
  const max = Math.max(1, ...data.map((d) => d.scans));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const barGap = 2;
  const barW = (innerW - barGap * (data.length - 1)) / data.length;

  const yTicks = [0, Math.ceil(max / 2), max];

  return (
    <div className="rounded-2xl border border-border bg-panel p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Daily Scans</h3>
          <p className="text-xs text-text-muted">Last 30 days across all users</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">Total</p>
          <p className="text-lg font-bold text-brand tabular-nums">
            {data.reduce((s, d) => s + d.scans, 0)}
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-48 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Daily scans bar chart"
      >
        <defs>
          <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => {
          const y = PAD.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                fontSize="9"
                textAnchor="end"
                fill="var(--text-muted)"
              >
                {t}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const h = (d.scans / max) * innerH;
          const x = PAD.left + i * (barW + barGap);
          const y = PAD.top + innerH - h;
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, d.scans > 0 ? 2 : 0)}
                rx={Math.min(barW / 2, 3)}
                fill="url(#barFill)"
              >
                <title>{`${d.day}: ${d.scans} scan${d.scans === 1 ? "" : "s"}`}</title>
              </rect>
            </g>
          );
        })}

        {data
          .filter((_, i) => i % 5 === 0 || i === data.length - 1)
          .map((d) => {
            const idx = data.indexOf(d);
            const x = PAD.left + idx * (barW + barGap) + barW / 2;
            const label = d.day.slice(5);
            return (
              <text
                key={d.day}
                x={x}
                y={H - 6}
                fontSize="9"
                textAnchor="middle"
                fill="var(--text-muted)"
              >
                {label}
              </text>
            );
          })}
      </svg>
    </div>
  );
}
