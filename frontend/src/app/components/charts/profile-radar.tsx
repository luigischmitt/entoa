"use client";

import { useSyncExternalStore } from "react";
import "./charts.css";

export type RadarItem = { key: string; group: "english" | "voice"; label: string; value: number; display: string };

const CENTER = 150;
const RADIUS = 112;

function angle(index: number, total: number) {
  return -Math.PI / 2 + (index * Math.PI * 2) / total;
}

function point(index: number, total: number, radius: number) {
  const a = angle(index, total);
  return { x: +(CENTER + radius * Math.cos(a)).toFixed(1), y: +(CENTER + radius * Math.sin(a)).toFixed(1) };
}

/**
 * Profile radar: every axis goes from 0 (center) to 100 (edge), so English patterns (% of answers without the error)
 * and Azure voice scores (0–100) share one scale. Each axis is labeled with its name and value, so nothing depends on
 * hover; English points are green circles and voice points warm diamonds. The entrance plays once on mount.
 */
// Phones: long axis names wrap onto lines of at most 10 characters, so the labels stay inside the card.
const narrowQuery = "(max-width: 559px)";
const subscribeNarrow = (onChange: () => void) => {
  const query = window.matchMedia(narrowQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useNarrowViewport = () => useSyncExternalStore(subscribeNarrow, () => window.matchMedia(narrowQuery).matches, () => false);
const LABEL_LINE = 16;

function wrapLabel(label: string, maxChars: number) {
  const lines: string[] = [];
  let current = "";
  for (const word of label.split(" ")) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** A diamond drawn directly (no rotate transform), so CSS scale animations keep it on its axis. */
const diamond = (x: number, y: number, r: number) => `${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`;

export function ProfileRadar({ items, active, selected, onSelect, label }: {
  items: RadarItem[];
  active: string | null;
  selected: string | null;
  /** Kept optional for compatibility. */
  onActive?: (key: string | null) => void;
  onSelect: (key: string) => void;
  label: string;
}) {
  const total = items.length;
  const narrow = useNarrowViewport();
  const ring = (fraction: number) => items.map((_, i) => { const p = point(i, total, RADIUS * fraction); return `${p.x},${p.y}`; }).join(" ");
  const shape = items.map((item, i) => { const p = point(i, total, (RADIUS * Math.max(0, Math.min(100, item.value))) / 100); return `${p.x},${p.y}`; }).join(" ");

  // Hover anywhere on the chart: the axis whose direction is closest to the pointer (seen from the center) becomes active.
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== "mouse" || total === 0) return;
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const dx = cursor.x - CENTER;
    const dy = cursor.y - CENTER;
    if (Math.hypot(dx, dy) < 8) return;
    const step = (Math.PI * 2) / total;
    const turns = (Math.atan2(dy, dx) + Math.PI / 2 + step / 2 + Math.PI * 4) % (Math.PI * 2);
    const key = items[Math.floor(turns / step) % total].key;
    if (key !== active) onSelect(key);
  };

  return (
    <svg viewBox="-66 -24 432 348" className="pr-svg" role="group" aria-label={label} onPointerMove={onPointerMove}>
      {[1, 0.75, 0.5, 0.25].map((fraction) => <polygon key={fraction} className="pr-ring" data-outer={fraction === 1} points={ring(fraction)} />)}
      {items.map((item, i) => {
        const edge = point(i, total, RADIUS);
        return <line key={item.key} className="pr-axis" pathLength={1} data-group={item.group} data-active={active === item.key} x1={CENTER} y1={CENTER} x2={edge.x} y2={edge.y} />;
      })}
      <polygon className="pr-shape" points={shape} />
      {items.map((item, i) => {
        const p = point(i, total, (RADIUS * Math.max(0, Math.min(100, item.value))) / 100);
        const on = active === item.key;
        const size = on ? 6 : 4.5;
        const style = { "--k": i } as React.CSSProperties;
        return item.group === "voice"
          ? <polygon key={item.key} className="pr-point" data-group="voice" data-active={on} style={style} points={diamond(p.x, p.y, size * Math.SQRT2)} />
          : <circle key={item.key} className="pr-point" data-group="english" data-active={on} style={style} cx={p.x} cy={p.y} r={size} />;
      })}
      {items.map((item, i) => {
        const a = angle(i, total);
        const at = point(i, total, RADIUS + 22);
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
        const dy = sin < -0.5 ? -14 : sin > 0.5 ? 6 : -4;
        const lines = narrow ? wrapLabel(item.label, 10) : [item.label];
        // Extra lines grow away from the chart: up for labels above or beside it, down for labels below it.
        const first = at.y + dy - (sin > 0.5 ? 0 : (lines.length - 1) * LABEL_LINE);
        return (
          <g
            key={item.key}
            className="pr-label"
            data-group={item.group}
            data-active={active === item.key}
            style={{ "--k": i } as React.CSSProperties}
            onMouseEnter={() => onSelect(item.key)}
            onClick={() => onSelect(item.key)}
          >
            {lines.map((line, n) => (
              <text key={n} className="pr-label-name" x={at.x} y={first + n * LABEL_LINE} textAnchor={anchor}>{line}</text>
            ))}
            <text className="pr-label-value" x={at.x} y={first + (lines.length - 1) * LABEL_LINE + 18} textAnchor={anchor}>{item.display}</text>
          </g>
        );
      })}
      {items.map((item, i) => {
        const p = point(i, total, (RADIUS * Math.max(0, Math.min(100, item.value))) / 100);
        return (
          <circle
            key={item.key}
            className="pr-hit"
            cx={p.x}
            cy={p.y}
            r={16}
            role="button"
            tabIndex={0}
            aria-label={`${item.label}: ${item.display}`}
            aria-pressed={selected === item.key}
            onMouseEnter={() => onSelect(item.key)}
            onFocus={() => onSelect(item.key)}
            onClick={() => onSelect(item.key)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(item.key);
              }
            }}
          />
        );
      })}
    </svg>
  );
}
