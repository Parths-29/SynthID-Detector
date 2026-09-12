"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, User, Mail, Lock, ArrowLeft, Sparkles } from "lucide-react";
import axios from "axios";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { InputField } from "@/components/ui/InputField";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Researcher");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/auth/signup`, {
        name,
        email,
        password,
        role,
      });

      if (response.data?.access_token) {
        localStorage.setItem("synthid_token", response.data.access_token);
        if (response.data.user) {
          localStorage.setItem("synthid_user", JSON.stringify(response.data.user));
        }
        router.push("/chat");
      } else {
        setError("Invalid response from auth server.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to create account. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md px-4 z-10 my-8"
      >
        <div className="bg-white/95 dark:bg-zinc-950/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50 text-zinc-900 dark:text-zinc-100 relative overflow-hidden">
          
          {/* Header Badge */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-900 to-black text-white flex items-center justify-center shadow-lg shadow-black/50 border border-zinc-800 mb-4 group hover:scale-105 transition-transform duration-300">
              <ShieldCheck className="w-7 h-7 text-zinc-100 group-hover:text-white transition-colors" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Create Researcher Account
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Join SynthID Detector for multi-spectral AI image verification
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-sm font-medium"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              id="name"
              label="Full Name"
              type="text"
              placeholder="Dr. Eleanor Vance"
              value={name}
              onChange={setName}
              required
            />

            <InputField
              id="email"
              label="Email Address"
              type="email"
              placeholder="eleanor@research-lab.org"
              value={email}
              onChange={setEmail}
              required
            />

            <InputField
              id="password"
              label="Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={setPassword}
              required
              hint="Must contain at least 6 characters"
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Primary Use Case / Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 text-base transition-all duration-200 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-900 dark:focus:ring-zinc-600"
              >
                <option value="Researcher">Academic / AI Researcher</option>
                <option value="Journalist">Digital Journalist & Press</option>
                <option value="Forensic">Digital Forensics Examiner</option>
                <option value="Developer">Software Developer / Engineer</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full mt-4"
            >
              Create Account & Start
            </Button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-zinc-900 dark:text-white font-semibold underline-offset-4 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}
