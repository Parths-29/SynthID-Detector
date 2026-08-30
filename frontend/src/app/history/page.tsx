"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ImageIcon,
  Clock,
  Filter,
  Search,
  XCircle,
} from "lucide-react";

interface HistoryItem {
  id: string;
  filename: string;
  is_watermarked: boolean;
  confidence: number;
  phase_match: number;
  processing_time_ms: number;
  timestamp: string;
  exif_data?: Record<string, string>;
  error?: string;
}

type FilterMode = "all" | "detected" | "clear";

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("synthid_scan_history");
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        setItems([]);
      }
    }
  }, []);

  const filteredItems = items
    .filter((item) => {
      if (filter === "detected") return item.is_watermarked;
      if (filter === "clear") return !item.is_watermarked && !item.error;
      return true;
    })
    .filter((item) =>
      searchQuery
        ? item.filename.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    )
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  const clearHistory = () => {
    localStorage.removeItem("synthid_scan_history");
    setItems([]);
    setSelectedItem(null);
  };

  const removeItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    localStorage.setItem("synthid_scan_history", JSON.stringify(updated));
    setItems(updated);
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  const stats = {
    total: items.length,
    detected: items.filter((i) => i.is_watermarked).length,
    clear: items.filter((i) => !i.is_watermarked && !i.error).length,
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/8 rounded-full mix-blend-normal filter blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/8 rounded-full mix-blend-normal filter blur-[128px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-400" />
              <h1 className="text-lg font-semibold">Scan History</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-sm text-white/70 hover:text-white transition-all border border-white/[0.05]"
            >
              New Scan
            </Link>
            {items.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-sm text-red-400 hover:text-red-300 transition-all border border-red-500/20 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5"
          >
            <div className="text-sm text-white/40 mb-1">Total Scans</div>
            <div className="text-3xl font-bold text-white/90">
              {stats.total}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5"
          >
            <div className="text-sm text-red-400/60 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Watermarks Detected
            </div>
            <div className="text-3xl font-bold text-red-400">
              {stats.detected}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5"
          >
            <div className="text-sm text-emerald-400/60 mb-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Clear Images
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {stats.clear}
            </div>
          </motion.div>
        </div>

        {/* Search & Filter bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by filename..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] rounded-xl p-1">
            <Filter className="w-4 h-4 text-white/30 ml-2 mr-1" />
            {(["all", "detected", "clear"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  filter === mode
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Results list */}
        {filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <ImageIcon className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-lg">
              {items.length === 0
                ? "No scans yet. Upload an image to get started."
                : "No results match your filter."}
            </p>
            {items.length === 0 && (
              <Link
                href="/chat"
                className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-sm transition-all border border-violet-500/20"
              >
                Start Scanning
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setSelectedItem(item)}
                  className={`bg-white/[0.02] border rounded-xl p-4 cursor-pointer transition-all hover:bg-white/[0.04] ${
                    selectedItem?.id === item.id
                      ? "border-violet-500/30 bg-violet-500/[0.03]"
                      : "border-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          item.error
                            ? "bg-amber-500/10"
                            : item.is_watermarked
                            ? "bg-red-500/10"
                            : "bg-emerald-500/10"
                        }`}
                      >
                        {item.error ? (
                          <XCircle className="w-4 h-4 text-amber-400" />
                        ) : item.is_watermarked ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white/90 truncate max-w-[300px]">
                          {item.filename}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-white/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.timestamp).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          {item.processing_time_ms && (
                            <span className="text-xs text-white/20">
                              {item.processing_time_ms.toFixed(0)}ms
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-white/40">Confidence</div>
                        <div className="text-sm font-mono text-white/80">
                          {((item.confidence || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      {item.error ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Error
                        </span>
                      ) : item.is_watermarked ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                          AI Detected
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Clear
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  <AnimatePresence>
                    {selectedItem?.id === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 mt-4 border-t border-white/[0.05] grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-white/30 mb-1">
                              Phase Match
                            </div>
                            <div className="text-sm font-mono text-white/70">
                              {((item.phase_match || 0) * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-white/30 mb-1">
                              Confidence
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${(item.confidence || 0) * 100}%`,
                                  backgroundColor: item.is_watermarked
                                    ? "rgb(239, 68, 68)"
                                    : "rgb(16, 185, 129)",
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-white/30 mb-1">
                              Processing
                            </div>
                            <div className="text-sm font-mono text-white/70">
                              {item.processing_time_ms?.toFixed(0) || "—"}ms
                            </div>
                          </div>
                        </div>
                        {item.exif_data &&
                          Object.keys(item.exif_data).length > 0 && (
                            <div className="pt-3 mt-3 border-t border-white/[0.05]">
                              <div className="text-xs text-white/30 mb-2">
                                EXIF Metadata
                              </div>
                              <div className="max-h-24 overflow-y-auto space-y-1">
                                {Object.entries(item.exif_data)
                                  .slice(0, 6)
                                  .map(([key, val], i) => (
                                    <div
                                      key={i}
                                      className="flex justify-between text-xs"
                                    >
                                      <span className="text-white/20 mr-4">
                                        {key}
                                      </span>
                                      <span className="text-white/50 text-right truncate max-w-[200px]">
                                        {val}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
