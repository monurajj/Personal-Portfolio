/**
 * What the browser will tell us about a player's device, saved next to their score
 * for the site owner. Browsers hide a lot on purpose: iPhones and Macs never report
 * their exact model, and Windows/Linux laptops don't either. Android phones usually
 * do (Chrome's client hints), and the graphics chip often hints at the machine
 * ("Apple M2", "Adreno 740", "NVIDIA RTX 3050").
 */

export type DeviceInfo = {
  kind: "phone" | "tablet" | "laptop / desktop";
  /** Best guess at the model: "SM-S918B", "iPhone", "Mac", "Windows PC". */
  model: string;
  os: string;
  browser: string;
  /** Graphics chip as reported by WebGL, when available. */
  gpu: string;
  /** "1512×982 @2x" */
  screen: string;
  cores: number;
  /** Approximate RAM in GB (Chrome rounds this down to at most 8). */
  memory: number;
};

type UAData = {
  brands?: Array<{ brand: string; version: string }>;
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string; platformVersion?: string; platform?: string }>;
};

const clip = (v: unknown, n = 80) => String(v ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);

function gpuName(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    if (!gl || !ext) return "";
    // "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)" → "Apple M2"
    const raw = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
    const inner = raw.match(/ANGLE \([^,]*,\s*(.*?)(?:\s*\(0x[0-9a-f]+\))?,/i)?.[1] ?? raw;
    return clip(inner.replace(/^ANGLE Metal Renderer:\s*/i, "").replace(/Direct3D11 vs_\S+ ps_\S+/i, ""));
  } catch {
    return "";
  }
}

export async function collectDevice(): Promise<DeviceInfo> {
  const ua = navigator.userAgent;
  const data = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  let hi: { model?: string; platformVersion?: string; platform?: string } = {};
  try {
    hi = (await data?.getHighEntropyValues?.(["model", "platformVersion", "platform"])) ?? {};
  } catch {}

  const iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const iPhone = /iPhone|iPod/.test(ua);
  const android = /Android/.test(ua);
  const tablet = iPad || (android && !/Mobile/.test(ua));
  const kind: DeviceInfo["kind"] = iPhone || (android && !tablet) ? "phone" : tablet ? "tablet" : "laptop / desktop";

  let os = "Unknown";
  let model = "";
  if (iPhone || iPad) {
    os = `iOS ${(ua.match(/OS (\d+)[_\d]*/)?.[1] ?? "").trim()}`.trim();
    model = iPad ? "iPad" : "iPhone";
  } else if (android) {
    const major = hi.platformVersion?.split(".")[0] ?? ua.match(/Android (\d+)/)?.[1] ?? "";
    os = `Android ${major}`.trim();
    model = hi.model || ua.match(/Android [\d.]+; ([^;)]+)/)?.[1]?.replace(/ Build.*/, "") || "Android phone";
    if (model === "K") model = "Android phone"; // frozen UA placeholder
  } else if (/Windows/.test(ua)) {
    // Windows 11 still says "Windows NT 10.0"; the client hint platform version (13+) tells them apart.
    const v = Number(hi.platformVersion?.split(".")[0] ?? 0);
    os = v >= 13 ? "Windows 11" : "Windows 10";
    model = "Windows PC";
  } else if (/Mac OS X|Macintosh/.test(ua)) {
    os = "macOS";
    model = "Mac";
  } else if (/CrOS/.test(ua)) {
    os = "ChromeOS";
    model = "Chromebook";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
    model = "Linux PC";
  }

  const brand = data?.brands?.map((b) => b.brand).find((b) => !/not.?a.?brand|chromium/i.test(b));
  const browser =
    /EdgA?\/(\d+)/.test(ua) ? `Edge ${ua.match(/EdgA?\/(\d+)/)![1]}`
    : /OPR\/(\d+)/.test(ua) ? `Opera ${ua.match(/OPR\/(\d+)/)![1]}`
    : /SamsungBrowser\/(\d+)/.test(ua) ? `Samsung Internet ${ua.match(/SamsungBrowser\/(\d+)/)![1]}`
    : /(?:Chrome|CriOS)\/(\d+)/.test(ua) ? `${brand && brand !== "Google Chrome" ? brand : "Chrome"} ${ua.match(/(?:Chrome|CriOS)\/(\d+)/)![1]}`
    : /(?:Firefox|FxiOS)\/(\d+)/.test(ua) ? `Firefox ${ua.match(/(?:Firefox|FxiOS)\/(\d+)/)![1]}`
    : /Version\/(\d+).*Safari/.test(ua) ? `Safari ${ua.match(/Version\/(\d+)/)![1]}`
    : "Unknown";

  const dpr = window.devicePixelRatio || 1;
  return {
    kind,
    model: clip(model),
    os: clip(os),
    browser: clip(browser),
    gpu: gpuName(),
    screen: `${screen.width}×${screen.height} @${Math.round(dpr * 10) / 10}x`,
    cores: Math.max(0, Math.floor(navigator.hardwareConcurrency || 0)),
    memory: Math.max(0, Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0)),
  };
}

/** Server-side: never trust the shape the client sent. */
export function cleanDevice(v: unknown): DeviceInfo | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  const kind = d.kind === "phone" || d.kind === "tablet" ? d.kind : "laptop / desktop";
  return {
    kind,
    model: clip(d.model),
    os: clip(d.os),
    browser: clip(d.browser),
    gpu: clip(d.gpu),
    screen: clip(d.screen, 40),
    cores: Math.min(256, Math.max(0, Math.floor(Number(d.cores) || 0))),
    memory: Math.min(1024, Math.max(0, Number(d.memory) || 0)),
  };
}

/** One line for the admin table: "Phone · SM-S918B · Android 14 · Chrome 126". */
export function deviceLabel(d: DeviceInfo): string {
  return [d.kind === "phone" ? "Phone" : d.kind === "tablet" ? "Tablet" : "Laptop / desktop", d.model, d.os, d.browser]
    .filter(Boolean)
    .join(" · ");
}

/** Stable id so the same device isn't stored twice for a pilot. */
export const deviceId = (d: DeviceInfo) => [d.model, d.os, d.browser, d.screen, d.gpu].join("|").toLowerCase();
