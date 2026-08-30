"use client";

import React from "react";
import { motion } from "framer-motion";

interface ConfidenceGaugeProps {
  /** Confidence value between 0 and 1 */
  value: number;
  /** Size in pixels */
  size?: number;
  /** Whether a watermark was detected */
  isWatermarked?: boolean;
  /** Show label text */
  showLabel?: boolean;
}

export function ConfidenceGauge({
  value,
  size = 120,
  isWatermarked = false,
  showLabel = true,
}: ConfidenceGaugeProps) {
  const clampedValue = Math.max(0, Math.min(1, value));
  const percentage = Math.round(clampedValue * 100);

  // Gauge geometry
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75; // 270 degrees
  const offset = arc - arc * clampedValue;

  // Color based on detection
  const getColor = () => {
    if (isWatermarked) {
      if (clampedValue > 0.8) return "#ef4444"; // red-500
      if (clampedValue > 0.5) return "#f97316"; // orange-500
      return "#eab308"; // yellow-500
    }
    return "#10b981"; // emerald-500
  };

  const color = getColor();

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-[135deg]"
      >
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc} ${circumference}`}
          strokeLinecap="round"
          initial={{ strokeDashoffset: arc }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-mono font-bold text-white/90"
          style={{ fontSize: size * 0.22 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {percentage}%
        </motion.span>
        {showLabel && (
          <motion.span
            className="text-white/40"
            style={{ fontSize: size * 0.09 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            confidence
          </motion.span>
        )}
      </div>
    </div>
  );
}
