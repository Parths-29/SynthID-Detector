"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface FrequencySpectrumProps {
  /** Array of normalized ring energies (0-1) */
  ringEnergies: number[];
  /** Index of the peak frequency ring */
  peakRing: number;
  /** Whether a watermark was detected */
  isWatermarked?: boolean;
  /** Height of the canvas in pixels */
  height?: number;
  /** Show axis labels */
  showLabels?: boolean;
}

export function FrequencySpectrum({
  ringEnergies,
  peakRing,
  isWatermarked = false,
  height = 120,
  showLabels = true,
}: FrequencySpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || ringEnergies.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = showLabels ? { top: 8, bottom: 20, left: 30, right: 8 } : { top: 4, bottom: 4, left: 4, right: 4 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    const barCount = ringEnergies.length;
    const barWidth = Math.max(2, (plotW / barCount) - 1);
    const gap = 1;

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    // Draw bars with animation effect via gradient
    ringEnergies.forEach((energy, i) => {
      const x = padding.left + i * (barWidth + gap);
      const barH = energy * plotH;
      const y = padding.top + plotH - barH;

      const isPeak = i === peakRing;

      if (isPeak) {
        // Highlighted peak bar
        const gradient = ctx.createLinearGradient(x, y, x, y + barH);
        if (isWatermarked) {
          gradient.addColorStop(0, "rgba(239, 68, 68, 0.9)");
          gradient.addColorStop(1, "rgba(239, 68, 68, 0.4)");
        } else {
          gradient.addColorStop(0, "rgba(16, 185, 129, 0.9)");
          gradient.addColorStop(1, "rgba(16, 185, 129, 0.4)");
        }
        ctx.fillStyle = gradient;

        // Glow effect
        ctx.shadowColor = isWatermarked
          ? "rgba(239, 68, 68, 0.5)"
          : "rgba(16, 185, 129, 0.5)";
        ctx.shadowBlur = 8;
      } else {
        // Normal bars
        const alpha = 0.15 + energy * 0.45;
        ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }

      // Rounded top
      const r = Math.min(barWidth / 2, 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barWidth - r, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
      ctx.lineTo(x + barWidth, y + barH);
      ctx.lineTo(x, y + barH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    });

    // Draw axis labels
    if (showLabels) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.font = "9px monospace";

      // Y axis
      ctx.textAlign = "right";
      ctx.fillText("1.0", padding.left - 4, padding.top + 6);
      ctx.fillText("0.0", padding.left - 4, padding.top + plotH + 2);

      // X axis
      ctx.textAlign = "center";
      ctx.fillText("Low freq", padding.left + plotW * 0.15, h - 4);
      ctx.fillText("High freq", padding.left + plotW * 0.85, h - 4);
    }
  }, [ringEnergies, peakRing, isWatermarked, height, showLabels]);

  if (ringEnergies.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="w-full"
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height }}
        className="rounded-lg"
      />
    </motion.div>
  );
}
