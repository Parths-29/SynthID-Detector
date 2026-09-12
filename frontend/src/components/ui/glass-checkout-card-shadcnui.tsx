"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Calendar, CreditCard, Lock } from "lucide-react";
import { useState } from "react";

interface GlassCheckoutCardProps {
  amount?: number;
  className?: string;
}

export function GlassCheckoutCard({
  amount = 85.8,
  className,
}: GlassCheckoutCardProps) {
  const [paymentMethod, setPaymentMethod] = useState("card");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("w-full max-w-[400px]", className)}
    >
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/10 bg-white/10 dark:bg-black/30 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/20">
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Payment Details
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Complete your purchase securely
            </p>
          </div>

          {/* Payment Methods */}
          <div className="mb-6 grid grid-cols-3 gap-2">
            {["card", "paypal", "apple"].map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={cn(
                  "flex h-12 items-center justify-center rounded-lg border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5 transition-all hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-300",
                  paymentMethod === method &&
                    "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                )}
              >
                {method === "card" && <CreditCard className="h-5 w-5" />}
                {method === "paypal" && (
                  <span className="font-bold italic">Pay</span>
                )}
                {method === "apple" && (
                  <span className="font-semibold">Pay</span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber" className="text-zinc-700 dark:text-zinc-300">Card Number</Label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  placeholder="0000 0000 0000 0000"
                  className="border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5 pl-10 backdrop-blur-sm focus:border-violet-500/50 focus:bg-white dark:focus:bg-white/10 text-zinc-900 dark:text-zinc-100"
                />
                <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry" className="text-zinc-700 dark:text-zinc-300">Expiry Date</Label>
                <div className="relative">
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    className="border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5 pl-10 backdrop-blur-sm focus:border-violet-500/50 focus:bg-white dark:focus:bg-white/10 text-zinc-900 dark:text-zinc-100"
                  />
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc" className="text-zinc-700 dark:text-zinc-300">CVC</Label>
                <div className="relative">
                  <Input
                    id="cvc"
                    placeholder="123"
                    className="border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5 pl-10 backdrop-blur-sm focus:border-violet-500/50 focus:bg-white dark:focus:bg-white/10 text-zinc-900 dark:text-zinc-100"
                  />
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-700 dark:text-zinc-300">Cardholder Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                className="border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm focus:border-violet-500/50 focus:bg-white dark:focus:bg-white/10 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <Button className="mt-6 w-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/40">
            Pay Rs {amount.toFixed(2)}
          </Button>

          <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
            <Lock className="inline-block h-3 w-3 mr-1" />
            Payments are secure and encrypted
          </p>
        </div>
      </div>
    </motion.div>
  );
}
