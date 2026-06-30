"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, BadgeCheck, DatabaseZap, ShieldCheck, Zap } from "lucide-react";

const lanes = [
  { label: "Adult intent", value: "92", tone: "lead" },
  { label: "Source proof", value: "7/9", tone: "cyan" },
  { label: "Fair start", value: "$149", tone: "accent" }
];

const rows = [
  { source: "Ecom operators", proof: "4,800 records", state: "Buyable", score: 92, price: "$149" },
  { source: "AI launch pages", proof: "Pricing changed", state: "Watch", score: 81, price: "$99" },
  { source: "Service routes", proof: "Demand spike", state: "Handoff", score: 88, price: "$249" }
];

export function LeadBrainVisual() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const element = canvas;
    const context = ctx;

    let frame = 0;
    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const nodeSpecs = [
      { x: 0.18, y: 0.2, r: 4, color: "#5cd0ff", speed: 0.75 },
      { x: 0.35, y: 0.12, r: 3, color: "#a6e36b", speed: 0.65 },
      { x: 0.72, y: 0.18, r: 5, color: "#ffd66b", speed: 0.7 },
      { x: 0.84, y: 0.37, r: 3, color: "#5cd0ff", speed: 0.9 },
      { x: 0.66, y: 0.62, r: 4, color: "#a6e36b", speed: 0.55 },
      { x: 0.26, y: 0.7, r: 5, color: "#ffd66b", speed: 0.62 },
      { x: 0.12, y: 0.52, r: 3, color: "#5cd0ff", speed: 0.8 },
      { x: 0.5, y: 0.42, r: 7, color: "#ffffff", speed: 0.45 }
    ];

    function resize() {
      const rect = element.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      element.width = Math.floor(width * dpr);
      element.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawNode(x: number, y: number, radius: number, color: string, pulse: number) {
      const glow = context.createRadialGradient(x, y, 0, x, y, radius * 7);
      glow.addColorStop(0, `${color}cc`);
      glow.addColorStop(0.28, `${color}44`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, radius * (6.2 + pulse), 0, Math.PI * 2);
      context.fill();

      context.fillStyle = color;
      context.beginPath();
      context.arc(x, y, radius + pulse * 0.45, 0, Math.PI * 2);
      context.fill();
    }

    function draw() {
      frame += 0.012;
      context.clearRect(0, 0, width, height);

      const bg = context.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#02040a");
      bg.addColorStop(0.45, "#06111f");
      bg.addColorStop(1, "#0b160d");
      context.fillStyle = bg;
      context.fillRect(0, 0, width, height);

      const grid = 32;
      context.strokeStyle = "rgba(92, 208, 255, 0.055)";
      context.lineWidth = 1;
      for (let x = -grid; x < width + grid; x += grid) {
        context.beginPath();
        context.moveTo(x + ((frame * 16) % grid), 0);
        context.lineTo(x + ((frame * 16) % grid), height);
        context.stroke();
      }
      for (let y = -grid; y < height + grid; y += grid) {
        context.beginPath();
        context.moveTo(0, y + ((frame * 10) % grid));
        context.lineTo(width, y + ((frame * 10) % grid));
        context.stroke();
      }

      const nodes = nodeSpecs.map((node, index) => {
        const drift = Math.sin(frame * node.speed + index) * 8;
        return {
          x: node.x * width + drift,
          y: node.y * height + Math.cos(frame * node.speed + index * 0.7) * 7,
          r: node.r,
          color: node.color
        };
      });

      const hub = nodes[nodes.length - 1];
      const ring = context.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, Math.min(width, height) * 0.48);
      ring.addColorStop(0, "rgba(92, 208, 255, 0.18)");
      ring.addColorStop(0.34, "rgba(255, 214, 107, 0.08)");
      ring.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = ring;
      context.fillRect(0, 0, width, height);

      nodes.slice(0, -1).forEach((node, index) => {
        const alpha = 0.28 + Math.sin(frame * 2 + index) * 0.16;
        const gradient = context.createLinearGradient(node.x, node.y, hub.x, hub.y);
        gradient.addColorStop(0, `${node.color}00`);
        gradient.addColorStop(0.45, `${node.color}aa`);
        gradient.addColorStop(1, "rgba(255,214,107,0.18)");
        context.strokeStyle = gradient;
        context.lineWidth = 1.4 + alpha * 1.6;
        context.beginPath();
        context.moveTo(node.x, node.y);
        const cpx = (node.x + hub.x) / 2 + Math.sin(frame + index) * 34;
        const cpy = (node.y + hub.y) / 2 + Math.cos(frame + index) * 26;
        context.quadraticCurveTo(cpx, cpy, hub.x, hub.y);
        context.stroke();

        const t = (frame * 0.55 + index * 0.17) % 1;
        const px = (1 - t) * (1 - t) * node.x + 2 * (1 - t) * t * cpx + t * t * hub.x;
        const py = (1 - t) * (1 - t) * node.y + 2 * (1 - t) * t * cpy + t * t * hub.y;
        drawNode(px, py, 2.2, node.color, 0.5);
      });

      nodes.forEach((node, index) => {
        drawNode(node.x, node.y, node.r, node.color, Math.sin(frame * 3 + index) + 1.5);
      });

      context.strokeStyle = "rgba(255, 214, 107, 0.18)";
      context.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        context.beginPath();
        context.ellipse(
          hub.x,
          hub.y,
          70 + i * 38 + Math.sin(frame * 1.4 + i) * 4,
          42 + i * 24,
          frame * 0.12 + i * 0.8,
          0,
          Math.PI * 2
        );
        context.stroke();
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    const observer = new ResizeObserver(resize);
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="lead-brain-visual signal-float">
      <div className="lead-brain-topbar">
        <div className="flex min-w-0 items-center gap-2">
          <span className="lead-live-dot" />
          <div className="min-w-0">
            <p>Live lead brain</p>
            <strong>Opportunity graph</strong>
          </div>
        </div>
        <span className="lead-brain-badge">
          <Zap className="h-4 w-4" />
          18,402 signals
        </span>
      </div>

      <div className="lead-brain-canvas-wrap">
        <canvas ref={canvasRef} aria-label="Animated buyer and source data graph" />
        <div className="lead-brain-orbit-card orbit-intent">
          <BadgeCheck className="h-4 w-4" />
          <span>intent verified</span>
        </div>
        <div className="lead-brain-orbit-card orbit-review">
          <ShieldCheck className="h-4 w-4" />
          <span>review gate</span>
        </div>
        <div className="lead-brain-orbit-card orbit-route">
          <DatabaseZap className="h-4 w-4" />
          <span>buyer route</span>
        </div>
      </div>

      <div className="lead-lane-grid">
        {lanes.map((lane) => (
          <div key={lane.label} className={`lead-lane-card lead-lane-${lane.tone}`}>
            <span>{lane.label}</span>
            <strong>{lane.value}</strong>
          </div>
        ))}
      </div>

      <div className="lead-row-stack">
        {rows.map((row) => (
          <div key={row.source} className="lead-market-row">
            <div className="min-w-0">
              <p className="truncate font-bold text-white">{row.source}</p>
              <div className="lead-score-meter" aria-hidden="true">
                <span style={{ width: `${row.score}%` }} />
              </div>
            </div>
            <span className="min-w-0 truncate text-ink-200">{row.proof}</span>
            <span className="lead-state-pill">{row.state}</span>
            <strong className="text-right text-accent-300">{row.price}</strong>
          </div>
        ))}
      </div>

      <div className="lead-brain-footer">
        <span>source proof</span>
        <ArrowRight className="h-4 w-4" />
        <span>confidence score</span>
        <ArrowRight className="h-4 w-4" />
        <span>fair buyer rate</span>
      </div>
    </div>
  );
}
