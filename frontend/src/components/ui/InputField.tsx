"use client";

import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  className?: string;
}

export function InputField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  className,
}: InputFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-3 rounded-xl border-2 text-base transition-all duration-200",
          "bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm text-zinc-900 dark:text-zinc-100",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          error
            ? "border-red-400 focus:ring-red-300 focus:border-red-500 dark:border-red-500"
            : "border-zinc-200 dark:border-zinc-800 focus:ring-zinc-400 focus:border-zinc-900 dark:focus:ring-zinc-600 dark:focus:border-zinc-400",
          "placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
        )}
      />
      {hint && !error && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{hint}</p>}
      {error && (
        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 mt-0.5">
          <AlertCircle size={14} className="shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
