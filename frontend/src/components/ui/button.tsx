"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  asChild = false,
  loading = false,
  disabled = false,
  className,
  id,
}: ButtonProps) {
  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200",
        size === "sm" ? "px-3 py-1.5 text-xs min-h-[36px]" : size === "lg" ? "px-6 py-4 text-lg min-h-[56px]" : "px-6 py-3.5 text-base min-h-[52px]",
        "min-w-[100px]",
        "active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variant === "primary" &&
          "bg-gradient-to-r from-black via-zinc-900 to-zinc-800 dark:from-white dark:via-zinc-100 dark:to-zinc-300 text-white dark:text-zinc-950 shadow-lg shadow-black/40 border border-zinc-800 dark:border-zinc-200 hover:shadow-xl hover:from-zinc-900 hover:to-black dark:hover:from-zinc-100 dark:hover:to-white",
        variant === "secondary" &&
          "bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
        variant === "outline" &&
          "bg-transparent border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        variant === "ghost" &&
          "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        className
      )}
    >
      {loading && <Loader2 size={20} className="animate-spin" />}
      {children}
    </button>
  );
}
