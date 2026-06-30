"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Sparkles, Zap } from "lucide-react";

const signalStack = [
  { label: "adult intent", value: "92", detail: "problem heat" },
  { label: "source proof", value: "7/9", detail: "evidence depth" },
  { label: "buyer pull", value: "$149", detail: "fair start" }
];

const buyerCards = [
  { label: "Ecom operators", meta: "4,800 public-source rows", value: "92 fit" },
  { label: "AI launch pages", meta: "pricing + demand movement", value: "81 fit" },
  { label: "Service routes", meta: "local urgency spike", value: "88 fit" }
];

const captureSteps = [
  "question",
  "signal",
  "score",
  "buyer"
];

export function LeadBrainVisual() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    const shellElement = shellRef.current;
    if (!canvasElement || !shellElement) return;

    const maybeContext = canvasElement.getContext("2d", { alpha: true });
    if (!maybeContext) return;
    const canvas = canvasElement;
    const shell = shellElement;
    const context = maybeContext;

    let frame = 0;
    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    const pointer = { x: 0, y: 0 };

    const particles = Array.from({ length: 72 }, (_, index) => {
      const angle = index * 2.399963 + 0.45;
      return {
        angle,
        orbit: 0.18 + ((index * 37) % 100) / 210,
        depth: 0.28 + ((index * 19) % 100) / 100,
        speed: 0.18 + ((index * 11) % 100) / 360,
        size: 1.1 + ((index * 7) % 8) * 0.28,
        color: index % 5 === 0 ? "#ffd66b" : index % 3 === 0 ? "#a6e36b" : "#5cd0ff",
      };
    });

    const streams = [
      { y: 0.2, color: "#5cd0ff", phase: 0 },
      { y: 0.38, color: "#a6e36b", phase: 1.3 },
      { y: 0.58, color: "#ffd66b", phase: 2.6 },
      { y: 0.76, color: "#5cd0ff", phase: 3.8 },
    ];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawGrid(cx: number, cy: number) {
      context.save();
      context.translate(cx + pointer.x * 8, cy + pointer.y * 5);
      context.strokeStyle = "rgba(150, 210, 255, 0.075)";
      context.lineWidth = 1;

      for (let i = -7; i <= 7; i++) {
        const x = i * 38;
        context.beginPath();
        context.moveTo(x * 0.38, -height * 0.42);
        context.lineTo(x, height * 0.46);
        context.stroke();
      }

      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const y = -height * 0.32 + t * height * 0.78;
        const spread = 0.26 + t * 0.88;
        context.beginPath();
        context.moveTo(-width * 0.5 * spread, y);
        context.lineTo(width * 0.5 * spread, y);
        context.stroke();
      }

      context.restore();
    }

    function drawRibbon(cx: number, cy: number, yRatio: number, color: string, phase: number) {
      const startX = -width * 0.1;
      const endX = width * 1.05;
      const startY = height * yRatio + Math.sin(frame * 1.4 + phase) * 18;
      const endY = cy + Math.cos(frame + phase) * 42;
      const c1x = width * 0.22 + Math.sin(frame * 0.9 + phase) * 36;
      const c1y = startY - 90;
      const c2x = width * 0.62 + Math.cos(frame * 0.8 + phase) * 46;
      const c2y = cy + 110 * Math.sin(phase + 0.4);

      const gradient = context.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, `${color}00`);
      gradient.addColorStop(0.22, `${color}99`);
      gradient.addColorStop(0.52, "rgba(255,255,255,0.55)");
      gradient.addColorStop(0.86, "rgba(255,214,107,0.32)");
      gradient.addColorStop(1, `${color}00`);

      context.strokeStyle = gradient;
      context.lineWidth = 2.2;
      context.beginPath();
      context.moveTo(startX, startY);
      context.bezierCurveTo(c1x, c1y, c2x, c2y, endX, endY);
      context.stroke();

      const t = (frame * 0.16 + phase * 0.17) % 1;
      const inv = 1 - t;
      const px =
        inv ** 3 * startX +
        3 * inv ** 2 * t * c1x +
        3 * inv * t ** 2 * c2x +
        t ** 3 * endX;
      const py =
        inv ** 3 * startY +
        3 * inv ** 2 * t * c1y +
        3 * inv * t ** 2 * c2y +
        t ** 3 * endY;

      const glow = context.createRadialGradient(px, py, 0, px, py, 22);
      glow.addColorStop(0, `${color}ff`);
      glow.addColorStop(0.4, `${color}66`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(px, py, 22, 0, Math.PI * 2);
      context.fill();
    }

    function drawLens(cx: number, cy: number) {
      const radius = Math.min(width, height) * 0.23;

      context.save();
      context.globalCompositeOperation = "lighter";
      const outer = context.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius * 1.9);
      outer.addColorStop(0, "rgba(92,208,255,0.20)");
      outer.addColorStop(0.38, "rgba(255,214,107,0.10)");
      outer.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = outer;
      context.beginPath();
      context.arc(cx, cy, radius * 1.9, 0, Math.PI * 2);
      context.fill();

      for (let i = 0; i < 4; i++) {
        const spin = frame * (0.18 + i * 0.04) + i * 0.9;
        context.strokeStyle = i % 2 ? "rgba(255,214,107,0.22)" : "rgba(92,208,255,0.26)";
        context.lineWidth = 1.2;
        context.beginPath();
        context.ellipse(cx, cy, radius * (0.78 + i * 0.26), radius * (0.27 + i * 0.11), spin, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();

      const glass = context.createRadialGradient(cx - radius * 0.3, cy - radius * 0.34, 0, cx, cy, radius);
      glass.addColorStop(0, "rgba(255,255,255,0.42)");
      glass.addColorStop(0.12, "rgba(92,208,255,0.26)");
      glass.addColorStop(0.46, "rgba(6,17,31,0.74)");
      glass.addColorStop(1, "rgba(1,4,8,0.92)");
      context.fillStyle = glass;
      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = "rgba(255,255,255,0.34)";
      context.lineWidth = 1;
      context.beginPath();
      context.arc(cx, cy, radius * 0.99, Math.PI * 1.1, Math.PI * 1.82);
      context.stroke();

      context.strokeStyle = "rgba(92,208,255,0.76)";
      context.lineWidth = 2.4;
      context.beginPath();
      context.arc(cx, cy, radius * 1.06, frame * 0.4, frame * 0.4 + Math.PI * 1.45);
      context.stroke();

      context.strokeStyle = "rgba(255,214,107,0.72)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(cx, cy, radius * 0.78, -frame * 0.48, -frame * 0.48 + Math.PI * 0.9);
      context.stroke();
    }

    function drawParticles(cx: number, cy: number) {
      context.save();
      context.globalCompositeOperation = "lighter";
      particles.forEach((particle, index) => {
        const depth = 0.42 + particle.depth * 0.86;
        const angle = particle.angle + frame * particle.speed;
        const orbitX = width * particle.orbit * depth;
        const orbitY = height * particle.orbit * 0.36 * depth;
        const x = cx + Math.cos(angle) * orbitX + pointer.x * 18 * particle.depth;
        const y = cy + Math.sin(angle) * orbitY + pointer.y * 12 * particle.depth;
        const alpha = 0.22 + particle.depth * 0.42;
        const size = particle.size * depth;

        if (index % 9 === 0) {
          context.strokeStyle = `${particle.color}33`;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(cx, cy);
          context.stroke();
        }

        const dot = context.createRadialGradient(x, y, 0, x, y, size * 6);
        dot.addColorStop(0, `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`);
        dot.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = dot;
        context.beginPath();
        context.arc(x, y, size * 6, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = particle.color;
        context.globalAlpha = alpha + 0.24;
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
      });
      context.restore();
    }

    function draw() {
      frame += 0.016;
      context.clearRect(0, 0, width, height);

      const cx = width * (0.5 + pointer.x * 0.025);
      const cy = height * (0.49 + pointer.y * 0.025);

      const bg = context.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#02040a");
      bg.addColorStop(0.42, "#07111f");
      bg.addColorStop(1, "#0b1008");
      context.fillStyle = bg;
      context.fillRect(0, 0, width, height);

      const wash = context.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.72);
      wash.addColorStop(0, "rgba(92,208,255,0.20)");
      wash.addColorStop(0.36, "rgba(255,214,107,0.08)");
      wash.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = wash;
      context.fillRect(0, 0, width, height);

      drawGrid(cx, cy + height * 0.06);
      streams.forEach((stream) => drawRibbon(cx, cy, stream.y, stream.color, stream.phase));
      drawParticles(cx, cy);
      drawLens(cx, cy);

      raf = requestAnimationFrame(draw);
    }

    function onPointerMove(event: PointerEvent) {
      const rect = shell.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    }

    function onPointerLeave() {
      pointer.x = 0;
      pointer.y = 0;
    }

    resize();
    draw();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    shell.addEventListener("pointermove", onPointerMove);
    shell.addEventListener("pointerleave", onPointerLeave);

    return () => {
      observer.disconnect();
      shell.removeEventListener("pointermove", onPointerMove);
      shell.removeEventListener("pointerleave", onPointerLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={shellRef} className="lead-brain-visual lead-gravity-visual">
      <div className="lead-gravity-aurora" aria-hidden="true" />
      <div className="lead-brain-topbar">
        <div className="flex min-w-0 items-center gap-2">
          <span className="lead-live-dot" />
          <div className="min-w-0">
            <p>Live capture field</p>
            <strong>Signal gravity engine</strong>
          </div>
        </div>
        <span className="lead-brain-badge">
          <Zap className="h-4 w-4" />
          18,402 signals
        </span>
      </div>

      <div className="lead-gravity-stage">
        <canvas ref={canvasRef} className="lead-gravity-canvas" aria-label="Animated data gravity field showing buyer and source signals" />

        <div className="gravity-glass-card gravity-source-card">
          <span className="gravity-card-kicker">pulled from pain</span>
          <strong>“I need customers this week.”</strong>
          <p>Intent answer, category, urgency, budget, source proof.</p>
        </div>

        <div className="gravity-glass-card gravity-buyer-card">
          <span className="gravity-card-kicker">matched buyer</span>
          <strong>Agency wants ecommerce operators</strong>
          <p>Fit score rises when source proof and purchase path line up.</p>
        </div>

        <div className="gravity-center-readout">
          <Sparkles className="h-4 w-4" />
          <span>value lock</span>
          <strong>$149</strong>
        </div>

        <div className="gravity-action-stack" aria-label="Signal scoring stages">
          {signalStack.map((item) => (
            <div key={item.label} className="gravity-signal-tile">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="lead-capture-strip" aria-label="LeadFlow capture path">
        {captureSteps.map((step, index) => (
          <div key={step} className="capture-step">
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>

      <div className="lead-buyer-tape">
        {buyerCards.map((card) => (
          <div key={card.label} className="buyer-tape-card">
            <div>
              <strong>{card.label}</strong>
              <span>{card.meta}</span>
            </div>
            <em>{card.value}</em>
          </div>
        ))}
      </div>

      <div className="lead-brain-footer">
        <span>question asked</span>
        <ArrowRight className="h-4 w-4" />
        <span>signal scored</span>
        <ArrowRight className="h-4 w-4" />
        <span>buyer pulled in</span>
      </div>
    </div>
  );
}
