"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("synthid_theme") as "dark" | "light" | null;
    const initial = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    if (initial === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("synthid_theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`relative group inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 backdrop-blur-xl border ${
        theme === "dark"
          ? "bg-zinc-900/80 border-zinc-800 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/80 shadow-lg shadow-black/40"
          : "bg-white/90 border-zinc-200 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-100 shadow-md shadow-zinc-200/50"
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {theme === "dark" ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="absolute"
            >
              <Moon className="w-4 h-4 text-violet-400" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="absolute"
            >
              <Sun className="w-4 h-4 text-amber-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showLabel && (
        <span className="capitalize tracking-wide font-medium">
          {theme === "dark" ? "Dark Mode" : "Light Mode"}
        </span>
      )}

      <Sparkles className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-0.5" />
    </button>
  );
}
