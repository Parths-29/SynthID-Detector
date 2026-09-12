"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatedAIChat } from "@/components/ui/animated-ai-chat";
import { LoaderIcon } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("synthid_token");
    if (!token) {
      router.push("/login");
    } else {
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <LoaderIcon className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="flex w-screen overflow-x-hidden">
      <AnimatedAIChat />
    </div>
  );
}
