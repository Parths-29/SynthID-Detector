/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Menu, X, Shield, Zap, BarChart3, Sparkles, Terminal, Code2, Database, Cpu, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { MagneticText } from "@/components/ui/morphing-cursor";
import { HeroHighlight } from "@/components/ui/hero-highlight";
import { cn } from "@/lib/utils";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden bg-background relative">
        <HeroHighlight containerClassName="h-auto min-h-screen items-start flex-col w-full">
          <div className="relative z-10 w-full pt-24 md:pt-36">
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center mx-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    href="/chat"
                    className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-black/5 transition-all duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
                  >
                    <span className="text-foreground text-sm">
                      Powered by Spectral Analysis & FFT Detection
                    </span>
                    <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

                    <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                      <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="mt-8 lg:mt-16 flex flex-col items-center justify-center">
                    <MagneticText text="DETECT AI" hoverText="SYNTHID" className="mb-2" />
                    <h2 className="text-balance text-3xl md:text-4xl lg:text-5xl font-medium flex items-center justify-center text-foreground/80">
                      <Cpu className="w-8 h-8 md:w-10 md:h-10 text-violet-500 mr-3 shrink-0" />
                      Watermarks in Seconds
                    </h2>
                  </div>
                  <p className="mx-auto mt-8 max-w-2xl text-balance text-lg">
                    Verify image authenticity by scanning for Google&apos;s SynthID
                    invisible watermark, EXIF metadata, and semantic AI Visual Analysis
                    to help you distinguish between human-made and AI-generated
                    imagery.
                  </p>
                </AnimatedGroup>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
                >
                  <div
                    key={1}
                    className="bg-foreground/10 rounded-[14px] border p-0.5"
                  >
                    <Button
                      asChild
                      size="lg"
                      className="rounded-xl px-5 text-base"
                    >
                      <Link href="/chat">
                        <span className="text-nowrap">Try It Now</span>
                      </Link>
                    </Button>
                  </div>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-10.5 rounded-xl px-5"
                  >
                    <Link
                      href="https://github.com/Parths-29/SynthID-Detector"
                      target="_blank"
                    >
                      <span className="text-nowrap">View on GitHub</span>
                    </Link>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div
                  aria-hidden
                  className="bg-gradient-to-b to-background absolute inset-0 z-10 from-transparent from-35%"
                />
                <div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
                  {/* Dark mode screenshot placeholder */}
                  <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 aspect-[15/8] relative rounded-2xl hidden dark:flex flex-col items-center justify-center gap-6 p-12">
                    <div className="flex items-center gap-3 text-white/60">
                      <Shield className="w-8 h-8 text-violet-400" />
                      <span className="text-2xl font-semibold text-white/90">
                        AI Provenance Checker
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-6 w-full max-w-3xl mt-4">
                      <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                        <Zap className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                        <div className="text-white/90 font-medium">
                          SynthID Detection
                        </div>
                        <div className="text-white/40 text-sm mt-1">
                          Spectral analysis
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                        <Shield className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                        <div className="text-white/90 font-medium">
                          EXIF Metadata
                        </div>
                        <div className="text-white/40 text-sm mt-1">
                          Metadata extraction
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                        <BarChart3 className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                        <div className="text-white/90 font-medium">
                          Batch Processing
                        </div>
                        <div className="text-white/40 text-sm mt-1">
                          Analyze many at once
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Light mode screenshot placeholder */}
                  <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 aspect-[15/8] relative rounded-2xl border dark:hidden flex flex-col items-center justify-center gap-6 p-12">
                    <div className="flex items-center gap-3 text-zinc-600">
                      <Shield className="w-8 h-8 text-violet-500" />
                      <span className="text-2xl font-semibold text-zinc-900">
                        AI Provenance Checker
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-6 w-full max-w-3xl mt-4">
                      <div className="bg-white rounded-xl p-6 border shadow-sm text-center">
                        <Zap className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                        <div className="text-zinc-900 font-medium">
                          SynthID Detection
                        </div>
                        <div className="text-zinc-400 text-sm mt-1">
                          Spectral analysis
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-6 border shadow-sm text-center">
                        <Shield className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <div className="text-zinc-900 font-medium">
                          EXIF Metadata
                        </div>
                        <div className="text-zinc-400 text-sm mt-1">
                          Metadata extraction
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-6 border shadow-sm text-center">
                        <BarChart3 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <div className="text-zinc-900 font-medium">
                          Batch Processing
                        </div>
                        <div className="text-zinc-400 text-sm mt-1">
                          Analyze many at once
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedGroup>
          </div>
          <section className="relative z-10 w-full pb-16 pt-16 md:pb-32">
          <div className="group relative m-auto max-w-5xl px-6">
            <div className="absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100">
              <Link
                href="https://github.com/Parths-29/SynthID-Detector"
                target="_blank"
                className="block text-sm duration-150 hover:opacity-75"
              >
                <span>Built With</span>
                <ChevronRight className="ml-1 inline-block size-3" />
              </Link>
            </div>
            <div className="group-hover:blur-xs mx-auto mt-12 grid max-w-2xl grid-cols-4 gap-x-12 gap-y-8 transition-all duration-500 group-hover:opacity-50 sm:gap-x-16 sm:gap-y-14">
              <div className="flex flex-col items-center gap-2">
                <img
                  className="mx-auto h-8 w-fit dark:invert"
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"
                  alt="Python"
                  height="32"
                  width="auto"
                />
                <span className="text-xs text-muted-foreground">Python</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img
                  className="mx-auto h-8 w-fit"
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg"
                  alt="FastAPI"
                  height="32"
                  width="auto"
                />
                <span className="text-xs text-muted-foreground">FastAPI</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img
                  className="mx-auto h-8 w-fit"
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg"
                  alt="React"
                  height="32"
                  width="auto"
                />
                <span className="text-xs text-muted-foreground">React</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img
                  className="mx-auto h-8 w-fit"
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg"
                  alt="Docker"
                  height="32"
                  width="auto"
                />
                <span className="text-xs text-muted-foreground">Docker</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img
                  className="mx-auto h-8 w-fit"
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/numpy/numpy-original.svg"
                  alt="NumPy"
                  height="32"
                  width="auto"
                />
                <span className="text-xs text-muted-foreground">NumPy</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img
                  className="mx-auto h-8 w-fit"
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg"
                  alt="TypeScript"
                  height="32"
                  width="auto"
                />
                <span className="text-xs text-muted-foreground">
                  TypeScript
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img
                  className="mx-auto h-8 w-fit dark:invert"
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg"
                  alt="Next.js"
                  height="32"
                  width="auto"
                />
                <span className="text-xs text-muted-foreground">Next.js</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <img
                  className="mx-auto h-8 w-fit"
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prometheus/prometheus-original.svg"
                  alt="Prometheus"
                  height="32"
                  width="auto"
                />
                <span className="text-xs text-muted-foreground">
                  Prometheus
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="relative z-10 w-full py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.03] to-transparent pointer-events-none" />
          <div className="mx-auto max-w-7xl px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">How It Works</h2>
              <p className="text-white/40 max-w-2xl mx-auto">Our advanced spectral analysis pipeline detects invisible signatures left by generative AI models like Google's Imagen.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 hover:bg-white/[0.04] transition-colors relative group">
                <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center mb-6 border border-violet-500/20 group-hover:scale-110 transition-transform">
                  <Database className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-xl font-semibold text-white/90 mb-3">1. Fast Fourier Transform (FFT)</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  The image is converted from the spatial domain to the frequency domain using 2D FFT, isolating high-frequency spectral components where watermarks are typically embedded.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 hover:bg-white/[0.04] transition-colors relative group">
                <div className="w-12 h-12 bg-fuchsia-500/10 rounded-xl flex items-center justify-center mb-6 border border-fuchsia-500/20 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-fuchsia-400" />
                </div>
                <h3 className="text-xl font-semibold text-white/90 mb-3">2. Concentric Ring Analysis</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  We calculate the magnitude spectrum and aggregate energies along concentric rings. A prominent spike in a specific frequency ring indicates the presence of a SynthID torus pattern.
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 hover:bg-white/[0.04] transition-colors relative group">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Code2 className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white/90 mb-3">3. Metadata Forensics</h3>
                <p className="text-white/60 leading-relaxed">
                  Simultaneously, the detector parses EXIF tags and raw binary signatures to find digital signatures from tools like Midjourney, DALL-E, or Gemini.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* API Docs Section */}
        <section className="relative z-10 w-full py-24 overflow-hidden border-t border-white/[0.05]">
          <div className="mx-auto max-w-7xl px-6 relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                <Terminal className="w-3 h-3" />
                Developer API
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Integrate directly into your pipeline</h2>
              <p className="text-white/40 text-lg">
                Automate your content moderation with our lightning-fast FastAPI backend. Upload single files or batch process thousands of images asynchronously.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/chat" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-colors">
                  Try the Demo
                </Link>
                <Link href="http://localhost:8001/docs" target="_blank" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors">
                  View Swagger Docs
                </Link>
              </div>
            </div>
            <div className="flex-1 w-full max-w-xl">
              <div className="bg-black border border-white/[0.05] rounded-2xl p-4 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-10 border-b border-white/[0.05] flex items-center px-4 gap-2 bg-white/[0.01]">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="pt-10">
                  <pre className="text-xs sm:text-sm text-white/70 overflow-x-auto p-4 rounded-xl bg-white/[0.02]">
                    <code className="language-bash">
<span className="text-pink-400">curl</span> -X POST \<br/>
  -F <span className="text-emerald-400">"file=@test-image.jpg"</span> \<br/>
  http://localhost:8000/detect<br/><br/>
<span className="text-white/30"># Response:</span><br/>
&#123;<br/>
  <span className="text-blue-400">"has_synthid"</span>: <span className="text-amber-400">true</span>,<br/>
  <span className="text-blue-400">"confidence"</span>: <span className="text-fuchsia-400">0.94</span>,<br/>
  <span className="text-blue-400">"visual_analysis"</span>: &#123;<br/>
    &nbsp;&nbsp;<span className="text-blue-400">"status"</span>: <span className="text-emerald-400">"completed"</span>,<br/>
    &nbsp;&nbsp;<span className="text-blue-400">"likelihood"</span>: <span className="text-emerald-400">"High"</span><br/>
  &#125;<br/>
  <span className="text-blue-400">"processing_time_ms"</span>: <span className="text-fuchsia-400">145</span><br/>
&#125;
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.05] bg-black py-12">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-violet-400" />
                <span className="font-semibold text-white/80">SynthID Detector</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-white/40">
                <Link href="/chat" className="hover:text-white/70 transition-colors">Try Demo</Link>
                <Link href="/history" className="hover:text-white/70 transition-colors">History</Link>
                <Link href="https://github.com/Parths-29/SynthID-Detector" target="_blank" className="hover:text-white/70 transition-colors">GitHub</Link>
                <Link href="http://localhost:8001/docs" target="_blank" className="hover:text-white/70 transition-colors">API Docs</Link>
              </div>
              <div className="text-xs text-white/20">
                &copy; {new Date().getFullYear()} Parth Sharma. MIT License.
              </div>
            </div>
            </div>
          </footer>
        </HeroHighlight>
      </main>
    </>
  );
}

const menuItems = [
  { name: "How It Works", href: "#how-it-works" },
  { name: "History", href: "/history" },
  { name: "API Docs", href: "http://localhost:8001/docs" },
  { name: "GitHub", href: "https://github.com/Parths-29/SynthID-Detector" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Shield className="w-6 h-6 text-violet-500" />
      <span className="font-semibold text-lg">SynthID Detector</span>
    </div>
  );
}

const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className="fixed z-20 w-full px-2 group"
      >
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
            isScrolled &&
              "bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5"
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                href="/"
                aria-label="home"
                className="flex items-center space-x-2"
              >
                <Logo />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={
                  menuState == true ? "Close Menu" : "Open Menu"
                }
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="in-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link
                      href={item.href}
                      className="text-muted-foreground hover:text-accent-foreground block duration-150"
                    >
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:border-transparent">
              <div className="flex w-full flex-col space-y-2 lg:hidden">
                {menuItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    className="text-muted-foreground hover:text-accent-foreground block duration-150"
                  >
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
              <div className="flex w-full gap-3 sm:w-fit">
                <Button asChild variant="outline" size="sm">
                  <Link href="/chat">
                    <span>Open App</span>
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/chat">
                    <span>Get Started</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
