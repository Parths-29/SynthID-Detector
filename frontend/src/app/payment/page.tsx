"use client";

import { GlassCheckoutCard } from "@/components/ui/glass-checkout-card-shadcnui";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ShieldCheck, ArrowLeft, Cpu } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function PaymentPage() {
  return (
    <AuroraBackground>
      {/* Navigation Top Bar */}
      <div className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between pointer-events-auto">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all shadow-lg shadow-black/40"
        >
          <ArrowLeft size={14} />
          <span>Back to Workspace</span>
        </Link>
        <ThemeToggle showLabel={true} />
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen z-10 p-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 max-w-md"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-900 text-white flex items-center justify-center shadow-lg shadow-violet-900/50 border border-violet-500/30 mb-6">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">
            Upgrade Your Plan
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            You've reached your free scan limit. Upgrade to a premium plan to continue analyzing images for AI watermarks and deepfakes.
          </p>
        </motion.div>

        <GlassCheckoutCard amount={499.00} />
      </div>
    </AuroraBackground>
  );
}
