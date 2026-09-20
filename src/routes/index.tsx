import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Anchor,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  CircleDot,
  CloudSnow,
  Cpu,
  Crosshair,
  Download,
  Edit3,
  FileJson,
  Fuel,
  Gauge,
  Layers,
  MapPin,
  Pause,
  Play,
  Plus,
  Radio,
  Radar,
  RefreshCcw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Ship,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "POLARIS-AI | Antarctic Navigation Support" },
      { name: "description", content: "Offline-first Antarctic sea-ice and iceberg trajectory navigation support console." },
      { property: "og:title", content: "POLARIS-AI | Antarctic Navigation Support" },
      { property: "og:description", content: "Tactical bridge HUD for sea-ice intelligence, drift prediction, and safe route planning." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PolarisConsole,
});

type Vessel = { id: string; name: string; iceClass: string; displacement: number; fuel: number; lat: string; lon: string; destination: string };
type Hazard = { id: string; type: string; mass: string; draft: number; velocity: number; lat: string; lon: string; riv: number; status: string; updated: string };
type Waypoint = { id: string; label: string; lat: string; lon: string; ice: number; fuel: number; risk: number };

const defaultVessel: Vessel = { id: "BIS-01", name: "Bharat Ice Surveyor", iceClass: "IACS PC6", displacement: 12400, fuel: 68, lat: "-69.4000", lon: "76.1833", destination: "Maitri Station" };
const defaultHazards: Hazard[] = [
  { id: "ICE-042", type: "Tabular", mass: "Large", draft: 245, velocity: 0.82, lat: "-68.9721", lon: "74.8216", riv: -2, status: "Evasive", updated: "04:12:08" },
  { id: "ICE-039", type: "Bergy Bit", mass: "Medium", draft: 88, velocity: 1.36, lat: "-69.1088", lon: "75.9032", riv: 1, status: "Monitor", updated: "04:10:43" },
  { id: "ICE-031", type: "Growler", mass: "Small", draft: 32, velocity: 2.08, lat: "-69.5228", lon: "76.4220", riv: 3, status: "Safe", updated: "04:08:16" },
];
const defaultWaypoints: Waypoint[] = [
  { id: "WP-01", label: "Bharati departure", lat: "-69.4000", lon: "76.1833", ice: 4, fuel: 0, risk: 1 },
  { id: "WP-02", label: "Safe corridor alpha", lat: "-69.2140", lon: "76.0112", ice: 6, fuel: 420, risk: 2 },
  { id: "WP-03", label: "Maitri approach", lat: "-70.7683", lon: "11.7333", ice: 3, fuel: 680, risk: 1 },
];

const fuelCurve = [0, 2, 4, 6, 7, 8, 9, 10].map((ice) => ({ ice: `${ice}/10`, baseline: 18 + ice * 2.8, polaris: 17 + ice * 2.2 + (ice > 6 ? (ice - 6) ** 2 * 4.8 : 0) }));
const driftCurve = [0, 4, 8, 12, 16, 20, 24].map((hour) => ({ hour: `${hour}h`, standard: 0.2 + hour * 0.18, polaris: 0.15 + hour * 0.1 + Math.sin(hour / 3) * 0.06 }));

const storage = <T,>(key: string, fallback: T) => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const useClientStoredState = <T,>(fallback: T) => {
  const [value, setValue] = useState(fallback);
  return [value, setValue] as const;
};

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => (typeof window === "undefined" ? fallback : storage(key, fallback)));
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}

function PolarisConsole() {
  const [vessel, setVessel] = useClientStoredState(defaultVessel);
  const [hazards, setHazards] = useClientStoredState(defaultHazards);
  const [waypoints, setWaypoints] = useClientStoredState(defaultWaypoints);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"bridge" | "shore">("bridge");
  const [pipelineStep, setPipelineStep] = useState(3);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [speed, setSpeed] = useState("1x");
  const [scanActive, setScanActive] = useState(false);
  const [logs, setLogs] = useState(["[INFO] Edge cache mounted. Offline mission workspace ready.", "[INFO] CMEMS current vector set: 2026-09-20T04:10Z", "[WARN] ICE-042 RIV Score: -2 — Evasive maneuver required."]);
  const [query, setQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingHazard, setEditingHazard] = useState<Hazard | null>(null);
  const [hazardDraft, setHazardDraft] = useState({ id: "", type: "Tabular", mass: "Medium", draft: "120", velocity: "1.10", lat: "-69.2500", lon: "75.5000", riv: "0" });
  const [formError, setFormError] = useState("");
  const [manifestTime, setManifestTime] = useState("LOCAL CACHE");

  useEffect(() => {
    setVessel(storage("polaris-vessel", defaultVessel));
    setHazards(storage("polaris-hazards", defaultHazards));
    setWaypoints(storage("polaris-waypoints", defaultWaypoints));
    setHydrated(true);
    setManifestTime(new Date().toISOString());
  }, [setHazards, setVessel, setWaypoints]);

  useEffect(() => { if (hydrated) window.localStorage.setItem("polaris-vessel", JSON.stringify(vessel)); }, [hydrated, vessel]);
  useEffect(() => { if (hydrated) window.localStorage.setItem("polaris-hazards", JSON.stringify(hazards)); }, [hazards, hydrated]);
  useEffect(() => { if (hydrated) window.localStorage.setItem("polaris-waypoints", JSON.stringify(waypoints)); }, [hydrated, waypoints]);

  const manifest = useMemo(() => ({
    manifestType: "IMO POLARIS Voyage Manifest",
    generatedAt: manifestTime,
    vessel,
    seaIceConcentrationMatrix: waypoints.map(({ id, label, lat, lon, ice }) => ({ waypointId: id, label, coordinate: { lat, lon }, concentrationTenths: ice })),
    icebergTrajectoryPredictions: hazards.map(({ id, type, lat, lon, velocity, riv }) => ({ targetId: id, type, predictedPosition24h: { lat, lon }, driftVelocityKnots: velocity, riv })),
    recommendedECDISWaypoints: waypoints.map(({ id, lat, lon, fuel, risk }) => ({ id, lat, lon, estimatedFuelKg: fuel, riskIndex: risk })),
  }), [hazards, manifestTime, vessel, waypoints]);

  useEffect(() => {
    if (!pipelineRunning) return;
    const delay = speed === "Instant Edge Speed" ? 220 : speed === "5x" ? 600 : speed === "0.5x" ? 2400 : 1200;
    const timer = window.setInterval(() => {
      setPipelineStep((current) => {
        const next = current >= 4 ? 1 : current + 1;
        setLogs((currentLogs) => [`[PROC] Step ${next}/4 — ${pipelineLabels[next - 1]}`, ...currentLogs].slice(0, 7));
        if (next === 4) setPipelineRunning(false);
        return next;
      });
    }, delay);
    return () => window.clearInterval(timer);
  }, [pipelineRunning, speed]);

  useEffect(() => {
    if (!scanActive) return;
    const timer = window.setInterval(() => setLogs((current) => [`[RADAR] X-band sweep ping — keel return confidence ${(82 + Math.round(Math.random() * 14))}%`, ...current].slice(0, 7)), 900);
    return () => window.clearInterval(timer);
  }, [scanActive]);

  const filteredHazards = hazards.filter((hazard) => `${hazard.id} ${hazard.type} ${hazard.status}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sortAsc ? a.riv - b.riv : b.riv - a.riv);
  const updateVessel = (field: keyof Vessel, value: string | number) => setVessel((current) => ({ ...current, [field]: value }));
  const validCoordinate = /^-?(?:[0-8]?\d(?:\.\d{1,4})?|90(?:\.0{1,4})?)$/.test(vessel.lat) && Number(vessel.lat) <= -60 && /^-?(?:\d{1,2}|1[0-7]\d|180)(?:\.\d{1,4})?$/.test(vessel.lon);

  const addTelemetry = () => {
    const id = `ICE-${String(43 + hazards.length).padStart(3, "0")}`;
    setHazards((current) => [{ id, type: "Tabular", mass: "Medium", draft: 146, velocity: 1.14, lat: "-69.6712", lon: "75.4802", riv: -1, status: "Evasive", updated: new Date().toLocaleTimeString("en-GB", { hour12: false }) }, ...current]);
    setLogs((current) => [`[RADAR] Target ${id} correlated from Sentinel-1 SAR return.`, ...current].slice(0, 7));
  };
  const saveHazard = () => {
    if (!hazardDraft.id || Number(hazardDraft.draft) <= 0) return;
    const next: Hazard = { ...hazardDraft, draft: Number(hazardDraft.draft), velocity: Number(hazardDraft.velocity), riv: Number(hazardDraft.riv), status: Number(hazardDraft.riv) < 0 ? "Evasive" : Number(hazardDraft.riv) > 2 ? "Safe" : "Monitor", updated: new Date().toLocaleTimeString("en-GB", { hour12: false }) };
    setHazards((current) => editingHazard ? current.map((item) => item.id === editingHazard.id ? next : item) : [next, ...current]);
    setEditingHazard(null);
    setHazardDraft({ id: "", type: "Tabular", mass: "Medium", draft: "120", velocity: "1.10", lat: "-69.2500", lon: "75.5000", riv: "0" });
  };
  const startEdit = (hazard: Hazard) => { setEditingHazard(hazard); setHazardDraft({ ...hazard, draft: String(hazard.draft), velocity: String(hazard.velocity), riv: String(hazard.riv) }); };
  const downloadManifest = () => { const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "polaris-imo-voyage-manifest.json"; anchor.click(); URL.revokeObjectURL(url); };

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <header className="sticky top-0 z-30 border-b border-line bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-4 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3 mr-auto">
            <div className="flex h-10 w-10 items-center justify-center border border-primary/50 bg-primary/10 text-primary"><Radar className="h-5 w-5" /></div>
            <div><div className="font-mono text-sm font-bold tracking-[0.18em] text-primary">POLARIS-AI</div><div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Edge-Native Navigation Support</div></div>
          </div>
          <div className="hidden items-center gap-2 border-l border-line pl-4 md:flex"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" /><span className="font-mono text-[11px] text-primary">EDGE LINK ONLINE</span></div>
          <div className="flex items-center gap-2 rounded border border-line bg-surface px-1 py-1"><Button onClick={() => setMode("bridge")} variant={mode === "bridge" ? "default" : "ghost"} size="sm"><Anchor />Bridge Ice Pilot</Button><Button onClick={() => setMode("shore")} variant={mode === "shore" ? "default" : "ghost"} size="sm"><Layers />Shore Command</Button></div>
          <Button onClick={() => setDrawerOpen(true)} variant="outline" size="sm"><FileJson />Manifest</Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] px-4 py-5 lg:px-6">
        <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Vessel" value={vessel.name} sub={`${vessel.iceClass} / ${vessel.id}`} icon={<Ship />} tone="teal" />
          <Metric label="POLARIS RIV" value="-2" sub="Evasive maneuver required" icon={<ShieldCheck />} tone="amber" />
          <Metric label="MGO Reserve" value={`${vessel.fuel}%`} sub={`${Math.round(vessel.fuel * 6.8)} t available`} icon={<Fuel />} tone="ice" />
          <Metric label="Tracked Targets" value={String(hazards.length).padStart(2, "0")} sub="3 correlated / 1 new return" icon={<Target />} tone="red" />
        </section>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(420px,0.9fr)]">
          <div className="min-w-0 space-y-5">
            <section className="panel overflow-hidden">
              <PanelHeader icon={<Crosshair />} eyebrow="Mission planning / 01" title="Bridge mission planner" action={<Badge className="border-primary/40 bg-primary/10 text-primary">LOCAL STATE SYNCED</Badge>} />
              <div className="grid gap-5 p-4 lg:grid-cols-[1fr_0.9fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Vessel ID"><Input value={vessel.id} onChange={(event) => updateVessel("id", event.target.value)} className="field" /></Field>
                  <Field label="Ship name"><Input value={vessel.name} onChange={(event) => updateVessel("name", event.target.value)} className="field" /></Field>
                  <Field label="Ice class"><Select value={vessel.iceClass} onValueChange={(value) => updateVessel("iceClass", value)}><SelectTrigger className="field"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 7 }, (_, index) => <SelectItem key={index} value={`IACS PC${index + 1}`}>IACS PC{index + 1}</SelectItem>)}</SelectContent></Select></Field>
                  <Field label="Target destination"><Input value={vessel.destination} onChange={(event) => updateVessel("destination", event.target.value)} className="field" /></Field>
                  <Field label="Starting latitude"><Input value={vessel.lat} onChange={(event) => updateVessel("lat", event.target.value)} className={`field font-mono ${validCoordinate ? "" : "border-danger focus-visible:ring-danger"}`} /><span className="mt-1 block font-mono text-[10px] text-muted-foreground">Range: -60.0000 to -90.0000</span></Field>
                  <Field label="Starting longitude"><Input value={vessel.lon} onChange={(event) => updateVessel("lon", event.target.value)} className="field font-mono" /><span className="mt-1 block font-mono text-[10px] text-muted-foreground">Range: -180.0000 to 180.0000</span></Field>
                  <Field label="Hull displacement (t)"><Input type="number" value={vessel.displacement} onChange={(event) => updateVessel("displacement", Number(event.target.value))} className="field font-mono" /></Field>
                  <Field label="MGO fuel budget (%)"><Input type="number" min="0" max="100" value={vessel.fuel} onChange={(event) => updateVessel("fuel", Number(event.target.value))} className="field font-mono" /></Field>
                </div>
                <div className="relative min-h-[250px] overflow-hidden border border-line bg-navy p-4">
                  <div className="absolute inset-0 opacity-50 tactical-grid" />
                  <div className="relative flex items-center justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Active route vector</div><div className="mt-1 text-sm font-semibold text-foreground">{vessel.destination} corridor</div></div><Badge className="border-ice/30 bg-ice/10 text-ice">{validCoordinate ? "COORD LOCK" : "CHECK INPUT"}</Badge></div>
                  <div className="relative mx-auto mt-4 h-36 max-w-[300px] rounded-full border border-primary/30 radar-grid"><div className="radar-sweep" /><div className="absolute left-[31%] top-[22%] h-2.5 w-2.5 animate-pulse rounded-full bg-danger shadow-[0_0_14px_var(--color-danger)]" /><div className="absolute left-[62%] top-[58%] h-2 w-2 rounded-full bg-amber" /><div className="absolute left-[46%] top-[69%] h-1.5 w-1.5 rounded-full bg-ice" /><div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" /></div>
                  <div className="relative mt-3 grid grid-cols-3 gap-2 font-mono text-[10px] text-muted-foreground"><span>LAT {vessel.lat}°</span><span className="text-center">HDG 084°</span><span className="text-right">LON {vessel.lon}°</span></div>
                </div>
              </div>
            </section>

            <section className="panel overflow-hidden">
              <PanelHeader icon={<Radar />} eyebrow="Telemetry / x-band sweep" title="Live ice hazard telemetry" action={<div className="flex gap-2"><Button onClick={() => setScanActive((current) => !current)} variant={scanActive ? "default" : "outline"} size="sm"><Radio className={scanActive ? "animate-pulse" : ""} />{scanActive ? "Scanning" : "Start scan"}</Button><Button onClick={addTelemetry} variant="outline" size="sm"><Plus />Register target</Button></div>} />
              <div className="grid gap-4 p-4 lg:grid-cols-[0.78fr_1.22fr]">
                <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden border border-line bg-navy"><div className="absolute inset-0 opacity-60 tactical-grid" /><div className="relative h-52 w-52 rounded-full border border-primary/30 radar-grid"><div className={`radar-sweep ${scanActive ? "radar-sweep-active" : ""}`} /><div className="absolute inset-8 rounded-full border border-primary/20" /><div className="absolute inset-16 rounded-full border border-primary/20" /><div className="absolute left-[30%] top-[23%] flex h-3 w-3 items-center justify-center rounded-full bg-danger"><span className="h-5 w-5 animate-ping rounded-full border border-danger" /></div><div className="absolute left-[67%] top-[63%] h-2.5 w-2.5 rounded-full bg-amber" /><div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_18px_var(--color-primary)]" /></div><div className="absolute bottom-3 left-3 font-mono text-[10px] text-primary">X-BAND // {scanActive ? "ACTIVE SWEEP" : "STANDBY"}</div><div className="absolute bottom-3 right-3 font-mono text-[10px] text-muted-foreground">RNG 24 NM</div></div>
                <div className="border border-line bg-navy/50 p-4"><div className="mb-3 flex items-center justify-between"><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Sub-surface keel acoustic return</div><Activity className={scanActive ? "text-primary animate-pulse" : "text-muted-foreground"} size={16} /></div><div className="flex h-20 items-center gap-1 border-y border-line px-2">{Array.from({ length: 58 }, (_, index) => <span key={index} className="w-1 rounded-full bg-ice/70" style={{ height: `${12 + ((index * 17) % 45) + (scanActive ? Math.sin(index) * 12 : 0)}px` }} />)}</div><div className="mt-5 grid grid-cols-3 gap-3"><Telemetry label="Sweep" value={scanActive ? "LIVE" : "IDLE"} /><Telemetry label="Confidence" value={scanActive ? "94%" : "—"} /><Telemetry label="Returns" value={scanActive ? "03" : "00"} /></div><div className="mt-5 flex items-center gap-2 border border-amber/30 bg-amber/10 p-3 text-xs text-amber"><AlertTriangle size={16} /> ICE-042 keel extends below safe clearance.</div></div>
              </div>
            </section>

            <section className="panel overflow-hidden">
              <PanelHeader icon={<Cpu />} eyebrow="Compute pipeline / edge runtime" title="Hydrodynamic drift & POLARIS pipeline" action={<div className="flex items-center gap-2"><Button onClick={() => { setPipelineStep(1); setPipelineRunning(true); }} size="sm"><Play />Execute</Button><Button onClick={() => setPipelineRunning(false)} variant="outline" size="icon" aria-label="Pause pipeline"><Pause /></Button><Button onClick={() => { setPipelineRunning(false); setPipelineStep(1); }} variant="ghost" size="icon" aria-label="Reset pipeline"><RotateCcw /></Button></div>} />
              <div className="p-4"><div className="mb-5 grid gap-2 md:grid-cols-4">{pipelineLabels.map((label, index) => { const step = index + 1; const active = pipelineStep === step; const complete = pipelineStep > step; return <div key={label} className={`relative border p-3 ${active ? "border-primary bg-primary/10" : complete ? "border-primary/30 bg-primary/5" : "border-line bg-surface"}`}><div className="flex items-center gap-2"><span className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] ${active ? "bg-primary text-primary-foreground" : complete ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{complete ? <Check size={13} /> : step}</span><span className="font-mono text-[10px] font-semibold uppercase leading-tight text-foreground">{label}</span></div>{index < 3 && <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 bg-background text-muted-foreground md:block">›</span>}</div>})}</div><div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]"><div className="border border-line bg-navy p-3"><div className="mb-2 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Edge execution console</span><span className="font-mono text-[10px] text-primary">{pipelineRunning ? "RUNNING" : "STANDBY"}</span></div><div className="h-28 overflow-hidden font-mono text-[11px] leading-6 text-muted-foreground">{logs.map((log, index) => <div key={`${log}-${index}`} className={log.includes("WARN") || log.includes("RIV") ? "text-amber" : log.includes("RADAR") ? "text-ice" : ""}>{log}</div>)}</div></div><div><div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Speed multiplier</div><div className="grid grid-cols-2 gap-2">{["0.5x", "1x", "5x", "Instant Edge Speed"].map((item) => <Button key={item} onClick={() => setSpeed(item)} variant={speed === item ? "default" : "outline"} className="h-10 text-[11px]">{item === "Instant Edge Speed" && <Zap />}{item}</Button>)}</div><div className="mt-4 flex items-center justify-between border border-line bg-surface p-3"><span className="text-xs text-muted-foreground">Current stage</span><span className="font-mono text-sm text-primary">{pipelineStep}/4</span></div></div></div></div>
            </section>
          </div>

          <div className="min-w-0 space-y-5">
            <section className="panel overflow-hidden">
              <PanelHeader icon={<Gauge />} eyebrow="Command analytics / live model" title={mode === "bridge" ? "Bridge tactical picture" : "Shore fleet overview"} action={<Badge className="border-ice/30 bg-ice/10 text-ice">{mode === "bridge" ? "VESSEL VIEW" : "GOA HQ"}</Badge>} />
              <div className="grid gap-4 p-4 sm:grid-cols-2"><ChartPanel title="Fuel penalty / ice concentration" subtitle="MGO kg per nautical mile"><ResponsiveContainer width="100%" height={185}><AreaChart data={fuelCurve}><defs><linearGradient id="fuelFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" /><XAxis dataKey="ice" stroke="var(--color-muted-foreground)" fontSize={10} /><YAxis stroke="var(--color-muted-foreground)" fontSize={10} /><Tooltip contentStyle={{ background: "var(--color-navy)", border: "1px solid var(--color-line)", color: "var(--color-foreground)", fontSize: 11 }} /><Area type="monotone" dataKey="polaris" stroke="var(--color-primary)" fill="url(#fuelFill)" strokeWidth={2} /><Line type="monotone" dataKey="baseline" stroke="var(--color-muted-foreground)" strokeDasharray="4 4" dot={false} /></AreaChart></ResponsiveContainer><div className="flex justify-between font-mono text-[9px] text-muted-foreground"><span>— POLARIS vector</span><span>— baseline</span></div></ChartPanel><ChartPanel title="24h drift trajectory variance" subtitle="Predicted variance / nautical miles"><ResponsiveContainer width="100%" height={185}><LineChart data={driftCurve}><CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" /><XAxis dataKey="hour" stroke="var(--color-muted-foreground)" fontSize={10} /><YAxis stroke="var(--color-muted-foreground)" fontSize={10} /><Tooltip contentStyle={{ background: "var(--color-navy)", border: "1px solid var(--color-line)", color: "var(--color-foreground)", fontSize: 11 }} /><Line type="monotone" dataKey="standard" stroke="var(--color-amber)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="polaris" stroke="var(--color-ice)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer><div className="flex justify-between font-mono text-[9px] text-muted-foreground"><span>— linear drift</span><span>— POLARIS AI</span></div></ChartPanel></div>
              <div className="grid grid-cols-3 divide-x divide-line border-t border-line"><StatusStat label="Route efficiency" value="+18.4%" tone="text-primary" /><StatusStat label="RIV confidence" value="96.8%" tone="text-ice" /><StatusStat label="Forecast horizon" value="24 h" tone="text-amber" /></div>
            </section>

            <section className="panel overflow-hidden">
              <PanelHeader icon={<AlertTriangle />} eyebrow="Risk register / editable" title="Hazard log" action={<div className="flex items-center gap-2"><div className="relative"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter target" className="h-8 w-32 pl-7 text-xs" /></div><Button onClick={() => setSortAsc((current) => !current)} variant="outline" size="icon" aria-label="Sort by risk">{sortAsc ? <ArrowUp /> : <ArrowDown />}</Button></div>} />
              <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="border-b border-line bg-surface font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-4 py-3">Target</th><th className="px-3 py-3">Position</th><th className="px-3 py-3">Draft</th><th className="px-3 py-3">Velocity</th><th className="px-3 py-3">RIV</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{filteredHazards.map((hazard) => <tr key={hazard.id} className="border-b border-line/70 last:border-0 hover:bg-surface/70"><td className="px-4 py-3"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${hazard.riv < 0 ? "bg-danger" : hazard.riv > 2 ? "bg-primary" : "bg-amber"}`} /><div><div className="font-mono font-semibold text-foreground">{hazard.id}</div><div className="text-[10px] text-muted-foreground">{hazard.type} · {hazard.status}</div></div></div></td><td className="px-3 py-3 font-mono text-[10px] text-muted-foreground">{hazard.lat}<br />{hazard.lon}</td><td className="px-3 py-3 font-mono">{hazard.draft}m</td><td className="px-3 py-3 font-mono text-ice">{hazard.velocity} kn</td><td className={`px-3 py-3 font-mono font-bold ${hazard.riv < 0 ? "text-danger" : hazard.riv > 2 ? "text-primary" : "text-amber"}`}>{hazard.riv}</td><td className="px-3 py-3"><div className="flex justify-end gap-1"><Button onClick={() => startEdit(hazard)} variant="ghost" size="icon" aria-label={`Edit ${hazard.id}`}><Edit3 /></Button><Button onClick={() => setHazards((current) => current.filter((item) => item.id !== hazard.id))} variant="ghost" size="icon" aria-label={`Delete ${hazard.id}`}><Trash2 /></Button></div></td></tr>)}</tbody></table></div>
              <div className="border-t border-line bg-surface/60 p-4"><div className="mb-3 flex items-center justify-between"><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{editingHazard ? `Edit ${editingHazard.id}` : "Register target"}</div>{editingHazard && <Button onClick={() => setEditingHazard(null)} variant="ghost" size="sm"><X />Cancel</Button>}</div><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">{(["id", "type", "mass", "draft", "velocity", "lat", "lon", "riv"] as const).map((field) => <Input key={field} value={hazardDraft[field]} onChange={(event) => setHazardDraft((current) => ({ ...current, [field]: event.target.value }))} placeholder={field.toUpperCase()} className="h-9 font-mono text-xs" />)}</div><Button onClick={saveHazard} className="mt-3"><Send />{editingHazard ? "Save changes" : "Register hazard"}</Button></div>
            </section>

            <section className="panel overflow-hidden">
              <PanelHeader icon={<MapPin />} eyebrow="ECDIS integration / local cache" title="Recommended safe route vector" action={<Button onClick={() => setWaypoints((current) => [...current, { id: `WP-${String(current.length + 1).padStart(2, "0")}`, label: "Manual override", lat: "-69.5400", lon: "75.8200", ice: 5, fuel: 240, risk: 2 }])} variant="outline" size="sm"><Plus />Waypoint</Button>} />
              <div className="divide-y divide-line">{waypoints.map((point, index) => <div key={point.id} className="flex items-center gap-3 p-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-[10px] text-primary">{String(index + 1).padStart(2, "0")}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{point.label}</span><Badge variant="outline" className="border-line text-[9px]">{point.ice}/10 ice</Badge></div><div className="mt-1 font-mono text-[10px] text-muted-foreground">{point.lat}° / {point.lon}°</div></div><div className="hidden text-right sm:block"><div className="font-mono text-xs text-foreground">{point.fuel} kg</div><div className="text-[10px] text-muted-foreground">est. MGO</div></div><div className={`font-mono text-sm ${point.risk < 2 ? "text-primary" : "text-amber"}`}>R{point.risk}</div><Button onClick={() => setWaypoints((current) => current.filter((item) => item.id !== point.id))} variant="ghost" size="icon" aria-label={`Delete ${point.id}`}><Trash2 /></Button></div>)}</div>
            </section>
          </div>
        </div>
      </div>

      <Button onClick={() => setDrawerOpen(true)} className="fixed bottom-5 right-5 z-20 h-12 rounded-full px-5 shadow-lg shadow-primary/20"><FileJson />Export IMO manifest</Button>
      {drawerOpen && <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"><aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-line bg-navy shadow-2xl"><div className="flex items-center justify-between border-b border-line p-5"><div><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Compliance export</div><h2 className="mt-1 text-lg font-semibold">IMO POLARIS Voyage Manifest</h2></div><Button onClick={() => setDrawerOpen(false)} variant="ghost" size="icon" aria-label="Close manifest preview"><X /></Button></div><div className="flex-1 overflow-auto p-5"><div className="mb-4 flex items-center gap-2 border border-primary/30 bg-primary/10 p-3 text-xs text-primary"><ShieldCheck size={16} /> Preview reflects the current local mission state.</div><pre className="overflow-x-auto border border-line bg-background p-4 font-mono text-[11px] leading-5 text-ice">{JSON.stringify(manifest, null, 2)}</pre></div><div className="flex gap-3 border-t border-line p-5"><Button onClick={downloadManifest} className="flex-1"><Download />Download .json</Button><Button onClick={() => setDrawerOpen(false)} variant="outline">Close</Button></div></aside></div>}
    </main>
  );
}

const pipelineLabels = ["Ingesting Sentinel-1 SAR & CMEMS", "Hydrodynamic drift model", "IMO POLARIS RIV calculation", "Fuel-optimal safe route"];

function Metric({ label, value, sub, icon, tone }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: "teal" | "amber" | "ice" | "red" }) {
  const toneClasses = { teal: "border-teal/30 bg-teal/10 text-teal", amber: "border-amber/30 bg-amber/10 text-amber", ice: "border-ice/30 bg-ice/10 text-ice", red: "border-danger/30 bg-danger/10 text-danger" }[tone];
  return <div className="panel flex items-center gap-4 p-4"><div className={`flex h-10 w-10 items-center justify-center border ${toneClasses}`}>{icon}</div><div className="min-w-0"><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div><div className="truncate text-lg font-semibold">{value}</div><div className="truncate text-[10px] text-muted-foreground">{sub}</div></div></div>;
}
function PanelHeader({ icon, eyebrow, title, action }: { icon: ReactNode; eyebrow: string; title: string; action?: ReactNode }) { return <div className="flex flex-wrap items-center gap-3 border-b border-line p-4"><div className="text-primary">{icon}</div><div className="mr-auto"><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div><h2 className="mt-1 text-base font-semibold tracking-tight">{title}</h2></div>{action}</div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>{children}</label>; }
function Telemetry({ label, value }: { label: string; value: string }) { return <div><div className="font-mono text-[9px] uppercase text-muted-foreground">{label}</div><div className="mt-1 font-mono text-sm text-foreground">{value}</div></div>; }
function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <div className="min-w-0 border border-line bg-surface p-3"><div className="mb-1 text-xs font-semibold">{title}</div><div className="mb-2 font-mono text-[9px] text-muted-foreground">{subtitle}</div>{children}</div>; }
function StatusStat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="p-3 text-center"><div className={`font-mono text-sm font-semibold ${tone}`}>{value}</div><div className="mt-1 text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{label}</div></div>; }