"use client";

import { useEffect, useRef, useCallback } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  Paperclip,
  SendIcon,
  XIcon,
  LoaderIcon,
  Sparkles,
  Command,
  ArrowLeft,
  FolderSearch,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Upload,
  Cpu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";
import axios from "axios";
import Link from "next/link";
import { ConfidenceGauge } from "@/components/ui/confidence-gauge";
import { FrequencySpectrum } from "@/components/ui/frequency-spectrum";
import { PieChart } from "@/components/ui/pie-chart";

// ── Hooks ──────────────────────────────────────────────────────────────────

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

// ── Textarea Component ────────────────────────────────────────────────────

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showRing
              ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              : "",
            className
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {showRing && isFocused && (
          <motion.span
            className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-violet-500/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

// ── Types ─────────────────────────────────────────────────────────────────

interface DetectionResult {
  filename: string;
  is_watermarked?: boolean;
  confidence?: number;
  phase_match?: number;
  multi_scale_consistency?: number;
  processing_time_ms?: number;
  exif_data?: Record<string, string>;
  details?: Record<string, unknown>;
  spectrum_data?: {
    ring_energies: number[];
    peak_ring: number;
    num_rings: number;
  };
  error?: string;
}

interface CommandSuggestion {
  icon: React.ReactNode;
  label: string;
  description: string;
  prefix: string;
}

// ── History helpers ───────────────────────────────────────────────────────

function saveToHistory(result: DetectionResult) {
  try {
    const stored = localStorage.getItem("synthid_scan_history");
    const history = stored ? JSON.parse(stored) : [];
    history.push({
      id: crypto.randomUUID(),
      filename: result.filename,
      is_watermarked: result.is_watermarked || false,
      confidence: result.confidence || 0,
      phase_match: result.phase_match || 0,
      processing_time_ms: result.processing_time_ms || 0,
      exif_data: result.exif_data || {},
      timestamp: new Date().toISOString(),
      error: result.error,
    });
    localStorage.setItem("synthid_scan_history", JSON.stringify(history));
  } catch {
    // localStorage quota exceeded or unavailable
  }
}

// ── Command suggestions ───────────────────────────────────────────────────

const commandSuggestions: CommandSuggestion[] = [
  {
    icon: <ImageIcon className="w-4 h-4" />,
    label: "Scan Image",
    description: "Upload & analyze an image for SynthID",
    prefix: "/scan",
  },
  {
    icon: <FolderSearch className="w-4 h-4" />,
    label: "Batch Scan",
    description: "Upload multiple images for batch analysis",
    prefix: "/batch",
  },
  {
    icon: <BarChart3 className="w-4 h-4" />,
    label: "View History",
    description: "See past detection results",
    prefix: "/history",
  },
  {
    icon: <Sparkles className="w-4 h-4" />,
    label: "Help",
    description: "Show help and usage instructions",
    prefix: "/help",
  },
];

// ── Main Component ────────────────────────────────────────────────────────

export function AnimatedAIChat() {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isColdStart, setIsColdStart] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);

  // Cold start timer
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isTyping) {
      timeout = setTimeout(() => setIsColdStart(true), 3000);
    } else {
      setIsColdStart(false);
    }
    return () => clearTimeout(timeout);
  }, [isTyping]);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [results, setResults] = useState<DetectionResult[]>([]);
  const [scannedFiles, setScannedFiles] = useState<Record<string, File>>({});
  const [deepScanResults, setDeepScanResults] = useState<Record<string, any>>({});
  const [classifyResults, setClassifyResults] = useState<Record<string, any>>({});
  const [isDeepScanning, setIsDeepScanning] = useState<Record<string, boolean>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });
  const [inputFocused, setInputFocused] = useState(false);
  const commandPaletteRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Generate image previews
  useEffect(() => {
    const urls = attachments.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [attachments]);

  // Command palette logic
  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCommandPalette(true);
      const matchingSuggestionIndex = commandSuggestions.findIndex((cmd) =>
        cmd.prefix.startsWith(value)
      );
      if (matchingSuggestionIndex >= 0) {
        setActiveSuggestion(matchingSuggestionIndex);
      } else {
        setActiveSuggestion(-1);
      }
    } else {
      setShowCommandPalette(false);
    }
  }, [value]);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Click outside command palette
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const commandButton = document.querySelector("[data-command-button]");
      if (
        commandPaletteRef.current &&
        !commandPaletteRef.current.contains(target) &&
        !commandButton?.contains(target)
      ) {
        setShowCommandPalette(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Drag and Drop ────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) {
      setAttachments((prev) => [...prev, ...files]);
    }
  };

  // ── Keyboard ─────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev < commandSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev > 0 ? prev - 1 : commandSuggestions.length - 1
        );
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        if (activeSuggestion >= 0) {
          const selectedCommand = commandSuggestions[activeSuggestion];
          handleCommandSelect(selectedCommand);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (attachments.length > 0) {
        handleSendMessage();
      }
    }
  };

  const handleCommandSelect = (command: CommandSuggestion) => {
    if (command.prefix === "/history") {
      window.location.href = "/history";
      return;
    }

    setValue(command.prefix + " ");
    setShowCommandPalette(false);

    if (command.prefix === "/scan" || command.prefix === "/batch") {
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
  };

  // ── Send message / detect ────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (attachments.length === 0) return;

    setIsTyping(true);
    setResults([]);

    if (attachments.length === 1) {
      const formData = new FormData();
      formData.append("image", attachments[0]);
      try {
        const res = await axios.post(`${API_BASE_URL}/detect`, formData);
        const result: DetectionResult = {
          filename: attachments[0].name,
          ...res.data,
        };
        setResults([result]);
        setScannedFiles(prev => ({ ...prev, [attachments[0].name]: attachments[0] }));
        saveToHistory(result);

        // Run classify alongside detect
        try {
          const classifyRes = await axios.post(`${API_BASE_URL}/classify`, formData);
          setClassifyResults(prev => ({ ...prev, [attachments[0].name]: classifyRes.data }));
        } catch (e) {
          console.error("Classification failed:", e);
        }
      } catch (err: unknown) {
        const error = err as {
          response?: { data?: { detail?: string } };
          message?: string;
        };
        const result: DetectionResult = {
          filename: attachments[0].name,
          error:
            error?.response?.data?.detail ||
            error.message ||
            "An error occurred",
        };
        setResults([result]);
        saveToHistory(result);
      }
    } else {
      const formData = new FormData();
      attachments.forEach((file) => formData.append("images", file));
      try {
        const res = await axios.post(
          `${API_BASE_URL}/detect-batch`,
          formData
        );
        const jobId = res.data.job_id;
        pollBatchStatus(jobId);
        return; // don't setIsTyping(false) yet
      } catch (err: unknown) {
        const error = err as {
          response?: { data?: { detail?: string } };
          message?: string;
        };
        const result: DetectionResult = {
          filename: "batch",
          error:
            error?.response?.data?.detail ||
            error.message ||
            "An error occurred",
        };
        setResults([result]);
        saveToHistory(result);
      }
    }

    setIsTyping(false);
    setAttachments([]);
    setValue("");
    adjustHeight(true);
  };

  const pollBatchStatus = async (jobId: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/detect-batch/${jobId}`);
      if (res.data.status === "completed") {
        const batchResults: DetectionResult[] = res.data.results;
        setResults(batchResults);
        batchResults.forEach(saveToHistory);
        setIsTyping(false);
        setAttachments([]);
        setValue("");
        adjustHeight(true);
      } else {
        setTimeout(() => pollBatchStatus(jobId), 2000);
      }
    } catch {
      setIsTyping(false);
    }
  };

  const runDeepScan = async (filename: string) => {
    const file = scannedFiles[filename];
    if (!file) return;
    
    setIsDeepScanning(prev => ({ ...prev, [filename]: true }));
    
    const formData = new FormData();
    formData.append("image", file);
    
    try {
      const res = await axios.post(`${API_BASE_URL}/deep-scan`, formData);
      setDeepScanResults(prev => ({ ...prev, [filename]: res.data }));
    } catch (e: any) {
      console.error(e);
      let errorMsg = "Failed to run deep scan. Please try again.";
      if (e.response?.status === 429 && e.response?.data?.status === 'rate_limited') {
        errorMsg = `Rate limit reached, try again in ~${e.response.data.retry_after_seconds}s`;
      }
      setDeepScanResults(prev => ({ ...prev, [filename]: { error: errorMsg } }));
    } finally {
      setIsDeepScanning(prev => ({ ...prev, [filename]: false }));
    }
  };

  // ── File handling ────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter((f) =>
        f.type.startsWith("image/")
      );
      setAttachments((prev) => [...prev, ...newFiles]);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const selectCommandSuggestion = (index: number) => {
    handleCommandSelect(commandSuggestions[index]);
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex flex-col items-center gap-4 p-12 rounded-3xl border-2 border-dashed border-violet-500/50 bg-violet-500/[0.05]"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <Upload className="w-12 h-12 text-violet-400" />
              <div className="text-xl font-medium text-white/90">
                Drop images to analyze
              </div>
              <div className="text-sm text-white/40">
                Supports JPEG, PNG, WebP, and more
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient background effects */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-1000" />
      </div>

      {/* Top nav */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex flex-col md:flex-row items-start md:items-center gap-4 bg-black/50 backdrop-blur-md p-2 rounded-xl border border-white/10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
        >
          <Clock className="w-4 h-4" />
          <span>History</span>
        </Link>
      </div>

      <div className="w-full max-w-2xl mx-auto relative mt-12 md:mt-0">
        <motion.div
          className="relative z-10 space-y-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 pb-2 flex items-center justify-center gap-4">
                <Cpu className="w-10 h-10 md:w-12 md:h-12 text-violet-500 shrink-0" />
                Upload an image to verify
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className="text-sm text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Drop images below, paste from clipboard, or type a command
            </motion.p>
          </div>

          {/* Chat Input */}
          <motion.div
            className={cn(
              "relative backdrop-blur-2xl bg-white/[0.02] rounded-2xl border shadow-2xl transition-colors",
              isDragOver
                ? "border-violet-500/40 bg-violet-500/[0.02]"
                : "border-white/[0.05]"
            )}
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Command palette */}
            <AnimatePresence>
              {showCommandPalette && (
                <motion.div
                  ref={commandPaletteRef}
                  className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-black/90 rounded-lg z-50 shadow-lg border border-white/10 overflow-hidden"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="py-1 bg-black/95">
                    {commandSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.prefix}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer",
                          activeSuggestion === index
                            ? "bg-white/10 text-white"
                            : "text-white/70 hover:bg-white/5"
                        )}
                        onClick={() => selectCommandSuggestion(index)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div className="w-5 h-5 flex items-center justify-center text-white/60">
                          {suggestion.icon}
                        </div>
                        <div className="font-medium">{suggestion.label}</div>
                        <div className="text-white/40 text-xs ml-1">
                          {suggestion.description}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Type /scan to analyze an image, or drag & drop files..."
                containerClassName="w-full"
                className={cn(
                  "w-full px-4 py-3",
                  "resize-none",
                  "bg-transparent",
                  "border-none",
                  "text-white/90 text-sm",
                  "focus:outline-none",
                  "placeholder:text-white/20",
                  "min-h-[60px]"
                )}
                style={{
                  overflow: "hidden",
                }}
                showRing={false}
              />
            </div>

            {/* Attachment chips with image previews */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  className="px-4 pb-3 flex gap-2 flex-wrap"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {attachments.map((file, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center gap-2 text-xs bg-white/[0.03] py-1.5 px-2 rounded-lg text-white/70 border border-white/[0.05]"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      {previews[index] ? (
                        <img
                          src={previews[index]}
                          alt={file.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-3 h-3 text-violet-400" />
                      )}
                      <span className="max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4 border-t border-white/[0.05] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  whileTap={{ scale: 0.94 }}
                  className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">Upload Image</span>
                </motion.button>
              </div>

              <motion.button
                type="button"
                onClick={handleSendMessage}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isTyping || attachments.length === 0}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "flex items-center gap-2",
                  attachments.length > 0
                    ? "bg-white text-[#0A0A0B] shadow-lg shadow-white/10"
                    : "bg-white/[0.05] text-white/40"
                )}
              >
                {isTyping ? (
                  <LoaderIcon className="w-4 h-4 animate-[spin_2s_linear_infinite]" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
                <span>{isTyping ? "Analyzing..." : "Analyze"}</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Command suggestion pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {commandSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.prefix}
                onClick={() => selectCommandSuggestion(index)}
                className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg text-sm text-white/60 hover:text-white/90 transition-all relative group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {suggestion.icon}
                <span>{suggestion.label}</span>
                <motion.div
                  className="absolute inset-0 border border-white/[0.05] rounded-lg"
                  initial={false}
                  animate={{
                    opacity: [0, 1],
                    scale: [0.98, 1],
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                />
              </motion.button>
            ))}
          </div>

          {/* Detection Results */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {results.map((result, idx) => (
                  <motion.div
                    key={idx}
                    className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] p-6 shadow-2xl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    {/* Result header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-white/60" />
                        <span className="text-sm font-medium text-white/90 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                          {result.filename}
                        </span>
                        {result.processing_time_ms && (
                          <span className="text-xs text-white/20 font-mono">
                            {result.processing_time_ms.toFixed(0)}ms
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {Boolean(result.details?.metadata_signature_found) && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Metadata Signature Found
                          </span>
                        )}
                      </div>
                    </div>

                    {result.error ? (
                      <p className="text-sm text-red-400">{result.error}</p>
                    ) : (
                      <div className="space-y-4">
                        {/* 1. Trained Model Verdict (Primary) */}
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                            Trained Model Verdict
                          </h4>
                          {!classifyResults[result.filename] ? (
                            <div className="text-sm text-white/40">Running classification model...</div>
                          ) : classifyResults[result.filename].model_status === "not_trained" ? (
                            <div className="text-sm text-yellow-400/80 bg-yellow-400/10 px-3 py-2 rounded-md inline-block">
                              Model not yet trained — dev preview
                            </div>
                          ) : (
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <div className="text-xs text-white/50 mb-1">AI Probability Score</div>
                                <div className="flex flex-col md:flex-row items-center gap-6 mt-2">
                                  <div className="shrink-0 w-[140px] h-[140px] flex items-center justify-center bg-black/20 rounded-full shadow-inner shadow-black/50 border border-white/5 relative">
                                    <div className="absolute inset-0 z-10">
                                      <PieChart 
                                        width={140} 
                                        height={140} 
                                        aiProbability={classifyResults[result.filename].probability} 
                                        animate={true}
                                        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col justify-center space-y-2">
                                    {classifyResults[result.filename].ood_status === "out_of_distribution" && (
                                      <div className="text-xs font-medium text-orange-400 bg-orange-400/10 px-3 py-2 rounded-md inline-block border border-orange-400/20 max-w-[200px]">
                                        <AlertTriangle className="w-4 h-4 inline-block mr-1 mb-0.5" />
                                        Outside trained scope — accuracy unverified
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {classifyResults[result.filename].heatmap && (
                                <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-white/10 relative">
                                  <img 
                                    src={classifyResults[result.filename].heatmap} 
                                    alt="Grad-CAM Heatmap" 
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-white/80 text-center py-0.5">
                                    Grad-CAM
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. Metadata Signature (Secondary) */}
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-white/90 mb-2">Metadata Forensics</h4>
                          {result.details?.metadata_signature_found ? (
                             <div className="text-sm text-blue-300 flex items-center gap-2">
                               <CheckCircle className="w-4 h-4" />
                               Metadata Signature Found: Yes
                             </div>
                          ) : (
                             <div className="text-sm text-white/50">
                               No recognizable AI generator metadata found.
                             </div>
                          )}
                        </div>

                        {/* 3. AI Reasoning (Gemini) */}
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-white/90 mb-3">AI Visual Reasoning</h4>
                          {!deepScanResults[result.filename] ? (
                            <button
                              onClick={() => runDeepScan(result.filename)}
                              disabled={isDeepScanning[result.filename]}
                              className="flex items-center justify-center w-full gap-2 text-sm bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors py-2 rounded-md"
                            >
                              {isDeepScanning[result.filename] ? (
                                <><LoaderIcon className="w-4 h-4 animate-spin" /> Running Deep Scan...</>
                              ) : (
                                <><Sparkles className="w-4 h-4" /> Run AI Visual Deep Scan</>
                              )}
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                                  deepScanResults[result.filename].likelihood === 'High' ? 'bg-red-500/20 text-red-300' :
                                  deepScanResults[result.filename].likelihood === 'Low' ? 'bg-emerald-500/20 text-emerald-300' :
                                  'bg-yellow-500/20 text-yellow-300'
                                )}>
                                  {deepScanResults[result.filename].likelihood} Likelihood
                                </span>
                              </div>
                              {deepScanResults[result.filename].error ? (
                                <p className="text-sm text-red-400/80">{deepScanResults[result.filename].error}</p>
                              ) : (
                                <p className="text-sm text-white/70 leading-relaxed">
                                  {deepScanResults[result.filename].reasoning}
                                  <br />
                                  <span className="text-[10px] text-white/30 italic mt-2 block">(AI-assisted narrative, not a mathematical measurement)</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Advanced Details (Hidden by default or minimized) */}
                        <details className="text-xs text-white/40 cursor-pointer">
                          <summary className="outline-none hover:text-white/60 transition-colors">Show legacy heuristic details</summary>
                          <div className="mt-2 pl-4 border-l border-white/10 space-y-3">
                            {/* Confidence gauge + metrics row */}
                            <div className="flex items-center gap-6">
                              <ConfidenceGauge
                                value={result.confidence || 0}
                                size={60}
                                isWatermarked={result.is_watermarked || false}
                              />
                              <div className="flex-1 space-y-3">
                                {/* Confidence bar */}
                                <div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-white/50">
                                      SynthID Confidence
                                    </span>
                                    <span className="text-white/90 font-mono">
                                      {((result.confidence || 0) * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full"
                                      style={{
                                        backgroundColor: result.is_watermarked
                                          ? "rgb(239, 68, 68)"
                                          : "rgb(16, 185, 129)",
                                      }}
                                      initial={{ width: 0 }}
                                      animate={{
                                        width: `${(result.confidence || 0) * 100}%`,
                                      }}
                                      transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                  </div>
                                </div>
    
                                {/* Phase match & multi-scale */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-white/50">Phase Match</span>
                                    <span className="text-white/90 font-mono">
                                      {((result.phase_match || 0) * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-white/50">
                                      Multi-Scale
                                    </span>
                                    <span className="text-white/90 font-mono">
                                      {(
                                        (result.multi_scale_consistency || 0) * 100
                                      ).toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
    
                            {/* Frequency spectrum visualization */}
                            {result.spectrum_data &&
                              result.spectrum_data.ring_energies.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/[0.05]">
                                  <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="text-white/50">
                                      FFT Frequency Spectrum
                                    </span>
                                    <span className="text-white/30 font-mono">
                                      Peak ring: {result.spectrum_data.peak_ring}
                                    </span>
                                  </div>
                                  <FrequencySpectrum
                                    ringEnergies={result.spectrum_data.ring_energies}
                                    peakRing={result.spectrum_data.peak_ring}
                                    isWatermarked={result.is_watermarked || false}
                                    height={100}
                                  />
                                </div>
                              )}
    
                            {/* EXIF section */}
                            {result.exif_data &&
                              Object.keys(result.exif_data).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/[0.05]">
                                  <div className="text-xs text-white/50 mb-2">
                                    EXIF Metadata
                                  </div>
                                  <div className="max-h-32 overflow-y-auto space-y-1">
                                    {Object.entries(result.exif_data).map(
                                      ([key, val], i) => (
                                        <div
                                          key={i}
                                          className="flex justify-between text-xs"
                                        >
                                          <span className="text-white/30 mr-4 shrink-0">
                                            {key}
                                          </span>
                                          <span className="text-white/60 text-right break-all">
                                            {val}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </details>

                        {/* Gemini Assistant */}
                        <DetectionAssistant 
                          result={result} 
                          deepScanResult={deepScanResults[result.filename]}
                          classifyResult={classifyResults[result.filename]}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Thinking indicator */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="fixed bottom-8 mx-auto transform backdrop-blur-2xl bg-white/[0.02] rounded-full px-4 py-2 shadow-lg border border-white/[0.05]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-center">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>{isColdStart ? "Waking up AI models (this may take a few extra seconds)" : "Analyzing"}</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mouse-following gradient */}
      {inputFocused && (
        <motion.div
          className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.02] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 blur-[96px]"
          animate={{
            x: mousePosition.x - 400,
            y: mousePosition.y - 400,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}
    </div>
  );
}

// ── Typing Dots ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-white/90 rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: "easeInOut",
          }}
          style={{
            boxShadow: "0 0 4px rgba(255, 255, 255, 0.3)",
          }}
        />
      ))}
    </div>
  );
}

// ── Gemini Assistant Component ──────────────────────────────────────────────

function DetectionAssistant({ 
  result, 
  deepScanResult,
  classifyResult 
}: { 
  result: DetectionResult,
  deepScanResult?: any,
  classifyResult?: any
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await axios.post(`${apiBase}/ask-assistant`, {
        message: userMsg,
        detection_context: result,
        deep_scan_context: deepScanResult,
        classify_context: classifyResult
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (e: any) {
      let errorMsg = "Sorry, I couldn't reach the AI assistant. Please try again.";
      if (e.response?.status === 429 && e.response?.data?.status === 'rate_limited') {
        errorMsg = `Rate limit reached, try again in ~${e.response.data.retry_after_seconds}s`;
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.05]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        {isOpen ? "Close AI Assistant" : "Ask about this result"}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3 overflow-hidden"
          >
            <div className="bg-black/20 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 text-sm flex flex-col">
              {messages.length === 0 && (
                <div className="text-white/40 text-center py-2">Ask me anything about this detection result...</div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn("p-2 rounded-md max-w-[90%]", m.role === 'user' ? "bg-white/10 self-end text-right" : "bg-violet-500/10 text-violet-100 self-start text-left")} style={{ whiteSpace: 'pre-wrap' }}>
                  {m.content}
                </div>
              ))}
              {isLoading && (
                <div className="bg-violet-500/10 text-violet-100 p-2 rounded-md max-w-[80%] self-start flex items-center gap-2">
                  <LoaderIcon className="w-3 h-3 animate-spin" /> Thinking...
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="How does this work? Can it be removed?"
                className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
