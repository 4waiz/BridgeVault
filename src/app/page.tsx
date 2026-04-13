import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Camera,
  Sparkles,
  Download,
  ChevronRight,
  Zap,
  Shield,
  Clock,
} from "lucide-react";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-bg flex flex-col overflow-x-hidden">
      {/* â”€â”€ Navbar â”€â”€ */}
      <header className="sticky top-0 z-50 bg-bg/70 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="px-5 sm:px-8 h-16 sm:h-[72px] flex items-center justify-between max-w-6xl mx-auto w-full">
          <Link href="/" className="flex items-center">
            <Image
              src="/svg.svg"
              alt="BRIDGE Vault"
              width={950}
              height={261}
              className="h-16 sm:h-20 w-auto"
              unoptimized
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/sign-in"
              className="hidden sm:inline-flex items-center h-10 px-5 text-sm font-semibold rounded-full text-text-muted hover:text-text transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center h-10 px-5 sm:px-6 text-sm font-bold rounded-full bg-brand text-white hover:bg-brand-strong transition-all active:scale-[0.97] cta-glow"
            >
              Get Started
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* â”€â”€ Hero Section â”€â”€ */}
        <section className="relative hero-glow">
          {/* Decorative accents */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {/* Top-right star */}
            <svg className="absolute top-20 right-[8%] w-12 h-12 sm:w-16 sm:h-16 text-brand/20 animate-float" viewBox="0 0 64 64" fill="none">
              <path d="M32 4l4 24 24 4-24 4-4 24-4-24L4 32l24-4z" fill="currentColor" />
            </svg>
            {/* Bottom-left circles */}
            <svg className="absolute bottom-32 left-[5%] w-20 h-20 sm:w-28 sm:h-28 text-white/[0.03] animate-spin-slow" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
              <circle cx="50" cy="50" r="40" />
              <circle cx="50" cy="50" r="25" />
            </svg>
            {/* Right side sparkle */}
            <svg className="absolute top-1/2 right-[3%] w-6 h-6 sm:w-8 sm:h-8 text-brand/30 animate-float delay-300" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 0l2 14 14 2-14 2-2 14-2-14L0 16l14-2z" />
            </svg>
            {/* Left side small star */}
            <svg className="absolute top-40 left-[3%] w-5 h-5 text-white/10 animate-float delay-500" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 0l2 14 14 2-14 2-2 14-2-14L0 16l14-2z" />
            </svg>
          </div>

          <div className="flex flex-col items-center text-center px-5 sm:px-8 pt-20 sm:pt-32 md:pt-40 pb-16 sm:pb-24 relative z-10">
            {/* Badge */}
            <div className="animate-slide-up inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white/[0.04] border border-white/[0.06] text-sm text-text-muted mb-8 sm:mb-10">
              <Zap className="h-3.5 w-3.5 text-brand" />
              <span>AI-powered lead capture</span>
            </div>

            {/* Headline */}
            <h1 className="animate-slide-up delay-100 text-[2.5rem] leading-[1.08] sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl">
              Turn business cards
              <br />
              into{" "}
              <span className="relative inline-block text-brand">
                actionable leads
                {/* Hand-drawn swoosh underline */}
                <svg
                  className="absolute -bottom-2 sm:-bottom-3 left-0 w-full h-3 sm:h-4"
                  viewBox="0 0 280 16"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 12C40 4 80 2 140 6C200 10 250 4 278 8"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="swoosh-underline"
                    opacity="0.5"
                  />
                </svg>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="animate-slide-up delay-200 mt-6 sm:mt-8 text-lg sm:text-xl text-text-muted max-w-xl leading-relaxed">
              Scan, extract, enrich, and manage your contacts in seconds.
              No manual data entry needed.
            </p>

            {/* CTA */}
            <div className="animate-slide-up delay-300 mt-10 sm:mt-12 w-full sm:w-auto">
              <Link
                href="/auth/sign-in"
                className="flex sm:inline-flex items-center justify-center gap-3 w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-12 text-lg sm:text-xl font-bold rounded-full bg-brand text-white hover:bg-brand-strong transition-all active:scale-[0.97] cta-glow"
              >
                <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                Start Scanning Free
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </Link>
            </div>

            {/* Trust Row */}
            <div className="animate-slide-up delay-400 mt-10 sm:mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-text-muted">
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-brand/60" />
                No credit card required
              </span>
              <span className="hidden sm:inline text-white/10">|</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-brand/60" />
                Set up in 30 seconds
              </span>
              <span className="hidden sm:inline text-white/10">|</span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-brand/60" />
                100% free to start
              </span>
            </div>
          </div>
        </section>

        {/* â”€â”€ How It Works â”€â”€ */}
        <section className="px-5 sm:px-8 pt-8 sm:pt-16 pb-20 sm:pb-32">
          <div className="max-w-5xl mx-auto">
            {/* Section label */}
            <div className="text-center mb-12 sm:mb-16">
              <span className="animate-slide-up inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand/70 mb-4">
                How it works
              </span>
              <h2 className="animate-slide-up delay-100 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                Three steps.{" "}
                <span className="text-text-muted">Zero friction.</span>
              </h2>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {[
                {
                  icon: Camera,
                  step: "01",
                  title: "Capture",
                  desc: "Snap a photo or upload a card image. Our OCR extracts every detail automatically â€” names, titles, emails, phones.",
                },
                {
                  icon: Sparkles,
                  step: "02",
                  title: "Enrich",
                  desc: "AI infers company domains, generates contact summaries, and flags duplicates before they hit your pipeline.",
                },
                {
                  icon: Download,
                  step: "03",
                  title: "Export",
                  desc: "Filter, sort, and export your leads to a real .xlsx file with one click. Ready for your CRM or outreach tool.",
                },
              ].map((f, i) => (
                <div
                  key={f.title}
                  className={`animate-slide-up-long card-premium group relative rounded-3xl p-6 sm:p-8 transition-all duration-300`}
                  style={{ animationDelay: `${0.2 + i * 0.15}s` }}
                >
                  {/* Step number */}
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-brand/50 mb-5 block">
                    Step {f.step}
                  </span>

                  {/* Icon */}
                  <div className="h-12 w-12 rounded-2xl bg-brand/10 border border-brand/10 flex items-center justify-center mb-5 group-hover:bg-brand/15 transition-colors">
                    <f.icon className="h-6 w-6 text-brand" />
                  </div>

                  {/* Content */}
                  <h3 className="font-extrabold text-xl sm:text-2xl mb-3 tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-[0.95rem] text-text-muted leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* â”€â”€ Bottom CTA â”€â”€ */}
        <section className="px-5 sm:px-8 pb-20 sm:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="card-premium rounded-3xl px-6 sm:px-12 py-12 sm:py-16 relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute inset-0 hero-glow opacity-60 pointer-events-none" aria-hidden="true" />

              <h2 className="relative text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
                Ready to stop typing contacts
                <span className="text-brand"> manually?</span>
              </h2>
              <p className="relative text-text-muted text-base sm:text-lg mb-8 max-w-md mx-auto">
                Join professionals who save hours every week with smart business card scanning.
              </p>
              <Link
                href="/auth/sign-in"
                className="relative inline-flex items-center justify-center gap-2.5 h-13 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-bold rounded-full bg-brand text-white hover:bg-brand-strong transition-all active:scale-[0.97] cta-glow"
              >
                Get Started Free
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* â”€â”€ Footer â”€â”€ */}
      <footer className="py-8 text-center border-t border-white/[0.04]">
        <div className="flex flex-col items-center gap-3 px-5">
          <Image src="/svg.svg" alt="BRIDGE Vault" width={950} height={261} className="h-12 sm:h-14 w-auto opacity-40" unoptimized />
          <p className="text-xs text-text-muted/40">
            &copy; {new Date().getFullYear()} BRIDGE Vault. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
