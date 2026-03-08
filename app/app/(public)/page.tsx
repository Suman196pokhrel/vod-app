import Link from "next/link";
import { VibeLogo } from "@/components/logos/VibeLogo";
import { LandingBackground } from "./_components/LandingBackground";
import { LandingHero } from "./_components/LandingHero";
import { LandingFeatures } from "./_components/LandingFeatures";
import { LandingStats } from "./_components/LandingStats";
import { LandingProjectSection } from "./_components/LandingProjectSection";
import { LandingAiRoadmap } from "./_components/LandingAiRoadmap";
import { LandingCTA } from "./_components/LandingCTA";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <LandingBackground />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Top navigation */}
        <header className="flex items-center justify-between py-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <VibeLogo size="md" animated />
            <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-slate-400 sm:inline">
              Open&#8209;source video on demand
            </span>
          </Link>

          <nav className="flex items-center gap-3 text-xs sm:text-sm">
            <Link
              href="/auth/sign-in"
              className="rounded-full px-3.5 py-1.5 text-slate-500 transition-colors hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-full bg-linear-to-r from-violet-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90"
            >
              Sign up
            </Link>
          </nav>
        </header>

        {/* Page sections */}
        <div className="flex flex-1 flex-col">
          <LandingHero />
          <LandingFeatures />
          <LandingStats />
          <LandingProjectSection />
          <LandingAiRoadmap />
          <LandingCTA />
        </div>

        {/* Footer */}
        <footer className="mt-14 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-5 text-[11px] text-slate-400">
          <span>Open-source project &middot; Demo ready &middot; Safe to explore.</span>
          <span className="hidden sm:inline">
            Python &middot; FastAPI &middot; Next.js &middot; AI roadmap active
          </span>
        </footer>
      </div>
    </main>
  );
}
