import type { Project } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * Procedural cover art for project cards — pure CSS/SVG so there are no
 * image assets to load and no screenshots to keep up to date.
 */
export function ProjectArt({ art, className }: { art: Project["art"]; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative isolate h-full w-full overflow-hidden border border-line bg-[radial-gradient(110%_80%_at_30%_0%,rgba(59,85,230,0.08),transparent_60%),var(--color-surface)]",
        className,
      )}
    >
      <div className="absolute inset-0">
        {art === "codemasti" && <CodeMastiArt />}
        {art === "drone" && <DroneArt />}
        {art === "nidar" && <NidarArt />}
        {art === "robotics" && <RoboticsArt />}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-surface to-transparent" />
    </div>
  );
}

const stroke = "#1c1f26";
const stroke2 = "#3b55e6";

function CodeMastiArt() {
  const tokens = ["<div>", "{ }", "=>", "def", "</>", "[ ]", "ai()", "const", "if", "::", "fn", "λ"];
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 p-6 font-mono text-xs text-accent/40">
        {tokens.map((t, i) => (
          <span
            key={i}
            className="flex items-center justify-center"
            style={{ opacity: 0.35 + ((i * 37) % 60) / 100, transform: `translateY(${(i % 3) * 4 - 4}px)` }}
          >
            {t}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="cm-g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor={stroke} />
            <stop offset="1" stopColor={stroke2} />
          </linearGradient>
        </defs>
        <text
          x="200"
          y="150"
          textAnchor="middle"
          fontFamily="var(--font-space-grotesk)"
          fontWeight="600"
          fontSize="112"
          fill="url(#cm-g)"
          opacity="0.9"
        >
          {"</>"}
        </text>
      </svg>
    </div>
  );
}

function DroneArt() {
  const arms = [
    [120, 80],
    [280, 80],
    [120, 170],
    [280, 170],
  ];
  return (
    <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full" fill="none">
      <g stroke={stroke} strokeOpacity="0.9" strokeWidth="1.5">
        {/* frame */}
        <rect x="170" y="100" width="60" height="50" rx="10" />
        {arms.map(([x, y], i) => (
          <line key={i} x1="200" y1="125" x2={x} y2={y} strokeOpacity="0.6" />
        ))}
        {/* rotors */}
        {arms.map(([x, y], i) => (
          <g key={i} style={{ transformOrigin: `${x}px ${y}px` }} className="animate-spin-slow">
            <circle cx={x} cy={y} r="34" strokeOpacity="0.35" />
            <circle cx={x} cy={y} r="28" strokeOpacity="0.8" strokeDasharray="6 10" />
            <line x1={x - 26} y1={y} x2={x + 26} y2={y} stroke={stroke2} />
            <line x1={x} y1={y - 26} x2={x} y2={y + 26} stroke={stroke2} />
          </g>
        ))}
        {/* paint spray */}
        <path d="M200 150 v40" strokeOpacity="0.8" />
        <path d="M185 195 q15 20 30 0" stroke={stroke2} strokeOpacity="0.9" />
        <path d="M175 205 q25 30 50 0" stroke={stroke2} strokeOpacity="0.5" />
        <path d="M165 215 q35 40 70 0" stroke={stroke2} strokeOpacity="0.25" />
      </g>
      <g fontFamily="var(--font-jetbrains)" fontSize="9" fill={stroke} fillOpacity="0.7">
        <text x="24" y="30">
          MULTIROTOR · PAYLOAD
        </text>
        <text x="24" y="44">
          POWER · BATTERY · INTEGRATION
        </text>
        <text x="300" y="232">
          PHASE II
        </text>
      </g>
    </svg>
  );
}

function NidarArt() {
  // Camera frame with YOLO-style detection boxes over a drone silhouette.
  const boxes = [
    { x: 150, y: 70, w: 110, h: 70, label: "drone 0.94" },
    { x: 60, y: 150, w: 70, h: 50, label: "target 0.88" },
    { x: 290, y: 140, w: 64, h: 46, label: "marker 0.81" },
  ];
  return (
    <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full" fill="none">
      {/* viewfinder corners */}
      <g stroke={stroke} strokeWidth="1.5" strokeOpacity="0.7">
        <path d="M24 44 v-20 h20" /><path d="M376 44 v-20 h-20" />
        <path d="M24 206 v20 h20" /><path d="M376 206 v20 h-20" />
      </g>
      {/* scan line */}
      <line x1="24" y1="125" x2="376" y2="125" stroke={stroke} strokeOpacity="0.15" strokeDasharray="3 5" />
      {/* drone silhouette */}
      <g stroke={stroke} strokeWidth="1.5" strokeOpacity="0.8" transform="translate(205 105)">
        <rect x="-14" y="-6" width="28" height="12" rx="3" />
        {[[-34,-22],[34,-22],[-34,22],[34,22]].map(([x,y],i)=>(
          <g key={i}><line x1="0" y1="0" x2={x} y2={y} strokeOpacity="0.5" /><circle cx={x} cy={y} r="12" strokeOpacity="0.6" /></g>
        ))}
      </g>
      {/* detection boxes */}
      {boxes.map((b) => (
        <g key={b.label}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} stroke={stroke2} strokeWidth="1.5" />
          <rect x={b.x} y={b.y - 14} width={b.label.length * 6.2 + 8} height="14" fill={stroke2} />
          <text x={b.x + 4} y={b.y - 4} fontFamily="var(--font-jetbrains)" fontSize="9" fill="#ffffff">{b.label}</text>
        </g>
      ))}
      <text x="24" y="240" fontFamily="var(--font-jetbrains)" fontSize="9" fill={stroke} fillOpacity="0.6">
        NIDAR 2025 · YOLO · ON-BOARD INFERENCE
      </text>
    </svg>
  );
}

function RoboticsArt() {
  const hexes: Array<[number, number]> = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 9; c++) {
      hexes.push([40 + c * 44 + (r % 2) * 22, 30 + r * 40]);
    }
  }
  const hex = (x: number, y: number, s: number) =>
    Array.from({ length: 6 })
      .map((_, i) => {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        return `${(x + s * Math.cos(a)).toFixed(1)},${(y + s * Math.sin(a)).toFixed(1)}`;
      })
      .join(" ");
  return (
    <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full" fill="none">
      <g stroke={stroke} strokeWidth="1">
        {hexes.map(([x, y], i) => (
          <polygon key={i} points={hex(x, y, 20)} strokeOpacity={0.08 + ((i * 53) % 30) / 100} />
        ))}
      </g>
      <g stroke={stroke2} strokeWidth="1.5">
        <polygon points={hex(200, 125, 46)} strokeOpacity="0.9" />
        <polygon points={hex(200, 125, 30)} strokeOpacity="0.5" strokeDasharray="5 7" />
        <circle cx="200" cy="125" r="10" stroke={stroke} />
      </g>
      <text x="24" y="232" fontFamily="var(--font-jetbrains)" fontSize="9" fill={stroke} fillOpacity="0.6">
        NEWTONBOTICS · ROBOTICS CLUB
      </text>
    </svg>
  );
}
