"use client";

import { useActionState } from "react";
import Image from "next/image";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { confirmOtp, requestOtp, type LoginState } from "@/app/actions/admin";
import { btn, input } from "./ui";

export function LoginForm({ pendingEmail }: { pendingEmail?: string | null }) {
  const initial: LoginState = pendingEmail ? { step: "code", email: pendingEmail } : { step: "email" };
  const [state, action, pending] = useActionState(
    async (prev: LoginState, formData: FormData) =>
      prev.step === "code" && formData.get("code") !== null ? confirmOtp(prev, formData) : requestOtp(prev, formData),
    initial,
  );

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-white/70 p-8 shadow-[0_20px_60px_-30px_rgba(18,18,18,0.25)]">
      <div className="flex items-center gap-2.5">
        <Image src="/logo.png" alt="" width={120} height={80} className="h-5 w-auto" />
        <span className="text-sm font-medium text-ink">Admin</span>
      </div>
      <h1 className="mt-6 font-display text-2xl font-medium tracking-tight text-ink">{state.step === "code" ? "Enter your code" : "Sign in"}</h1>
      <p className="mt-1.5 text-sm text-muted">
        {state.step === "code" ? `We emailed a 6-digit code to ${state.email}. It expires in 10 minutes.` : "Admins only. A one-time code will be emailed to you."}
      </p>

      <form action={action} className="mt-6 space-y-4">
        {state.step === "code" ? (
          <>
            <input type="hidden" name="email" value={state.email ?? ""} />
            <div>
              <label htmlFor="code" className="mb-1.5 block text-xs font-medium text-muted">
                Code
              </label>
              <input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                autoFocus
                className={`${input} py-2.5 text-center font-mono text-2xl tracking-[0.5em]`}
                placeholder="••••••"
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="email" autoFocus className={`${input} py-2.5`} placeholder="you@example.com" />
          </div>
        )}

        {(state.error || state.message) && (
          <p role="status" className={`rounded-lg px-3 py-2 text-sm ${state.error ? "bg-red-500/10 text-red-700" : "bg-surface text-muted"}`}>
            {state.error ?? state.message}
          </p>
        )}

        <button type="submit" disabled={pending} className={`${btn.primary} w-full justify-center py-2.5`}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : state.step === "code" ? <ShieldCheck className="size-4" strokeWidth={1.75} /> : <ArrowRight className="size-4" strokeWidth={1.75} />}
          {state.step === "code" ? "Verify and sign in" : "Send code"}
        </button>

        {state.step === "code" && (
          <button
            type="submit"
            formNoValidate
            onClick={(e) => {
              // Submitting without a code field falls through to requestOtp again.
              e.currentTarget.form?.querySelector<HTMLInputElement>("input[name=code]")?.remove();
            }}
            className="w-full text-center text-sm text-muted hover:text-ink"
          >
            Resend code
          </button>
        )}
      </form>
    </div>
  );
}
