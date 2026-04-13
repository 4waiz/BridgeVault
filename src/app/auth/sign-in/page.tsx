"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";

export default function SignInPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Account created! You can now sign in.");
        setMode("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col lg:flex-row relative overflow-hidden">
      {/* — Left branding panel (desktop only) — */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col items-center justify-center p-12">
        {/* Background glow */}
        <div className="absolute inset-0 hero-glow pointer-events-none" aria-hidden="true" />
        {/* Decorative gradient orb */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(243,106,33,0.08) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <Image
            src="/svg.svg"
            alt="BRIDGE Vault"
            width={96}
            height={96}
            className="h-32 w-32 mb-8"
            unoptimized
          />
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">
            Turn cards into
            <span className="text-brand"> leads</span>
          </h2>
          <p className="text-text-muted leading-relaxed">
            Scan, extract, and manage your business contacts in seconds.
            No manual data entry needed.
          </p>

          {/* Trust badges */}
          <div className="mt-10 flex flex-col gap-3 text-sm text-text-muted">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand/60" />
              AI-powered OCR extraction
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand/60" />
              One-click .xlsx export
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand/60" />
              100% free to start
            </span>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="absolute right-0 top-[15%] bottom-[15%] w-px bg-linear-to-b from-transparent via-white/6 to-transparent" />
      </div>

      {/* — Right form panel — */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-12 sm:py-16 relative">
        {/* Mobile background glow */}
        <div className="lg:hidden absolute inset-0 hero-glow pointer-events-none" aria-hidden="true" />

        {/* Back to home */}
        <Link
          href="/"
          className="absolute top-5 left-5 sm:top-8 sm:left-8 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors z-10"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        <div className="w-full max-w-105 relative z-10">
          {/* Logo (mobile only) */}
          <div className="text-center mb-8 sm:mb-10">
            <Link href="/" className="lg:hidden inline-flex items-center justify-center mb-6">
              <Image
                src="/svg.svg"
                alt="BRIDGE Vault"
                width={64}
                height={64}
                className="h-20 w-20"
                unoptimized
              />
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-base text-text-muted mt-2.5 leading-relaxed">
              {mode === "signin"
                ? "Sign in to manage your leads"
                : "Start capturing business cards today"}
            </p>
          </div>

          {/* Form Card */}
          <div className="card-premium rounded-2xl sm:rounded-3xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <Input
                  label="Full Name"
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              )}
              <Input
                label="Email"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
              <Input
                label="Password"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
                required
              />

              {error && (
                <div className="text-sm text-danger bg-danger/10 px-4 py-2.5 rounded-xl">
                  {error}
                </div>
              )}
              {message && (
                <div className="text-sm text-success bg-success/10 px-4 py-2.5 rounded-xl">
                  {message}
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                className="w-full h-12! rounded-xl! text-base! font-bold! cta-glow"
              >
                {mode === "signin" ? "Sign In" : "Create Account"}
              </Button>
            </form>
          </div>

          {/* Toggle mode */}
          <p className="text-center text-sm text-text-muted mt-6">
            {mode === "signin"
              ? "Don\u2019t have an account?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
                setMessage("");
              }}
              className="text-brand font-semibold hover:text-brand-strong transition-colors cursor-pointer"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
