"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { sendContact, type ContactState } from "@/app/actions/contact";
import { cn } from "@/lib/utils";
import { Magnetic } from "@/components/ui/Magnetic";

const initial: ContactState = { status: "idle" };

function Field({
  label,
  name,
  error,
  defaultValue,
  textarea,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: "name" | "email" | "message";
  error?: string;
  defaultValue?: string;
  textarea?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  const id = `contact-${name}`;
  const shared = {
    id,
    name,
    defaultValue,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${id}-error` : undefined,
    className: "field",
  };
  return (
    <div>
      <label htmlFor={id} className="eyebrow block">
        {label}
      </label>
      {textarea ? (
        <textarea {...shared} rows={4} placeholder="Tell me about it…" className={cn(shared.className, "resize-y")} />
      ) : (
        <input {...shared} type={type} autoComplete={autoComplete} placeholder={type === "email" ? "you@company.com" : "Your name"} />
      )}
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-xs text-[#d64545]"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, initial);
  const [startedAt, setStartedAt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setStartedAt(Date.now()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  const v = state.values;

  return (
    <form ref={formRef} action={action} noValidate className="relative">
      <div className="flex items-baseline justify-between rule pt-6">
        <p className="eyebrow">Or send a message</p>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">Replies within 48h</span>
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <Field label="Name" name="name" autoComplete="name" defaultValue={v?.name} error={state.errors?.name} />
        <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={v?.email} error={state.errors?.email} />
        <div className="sm:col-span-2">
          <Field label="Message" name="message" textarea defaultValue={v?.message} error={state.errors?.message} />
        </div>
      </div>

      {/* Honeypot + timing token. Hidden from humans, irresistible to bots. */}
      <div className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden>
        <label>
          Company <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="startedAt" value={startedAt} />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div aria-live="polite" className="min-h-5 text-sm">
          <AnimatePresence mode="wait">
            {state.message && (
              <motion.p
                key={`${state.status}-${state.message}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={cn("inline-flex items-center gap-2", state.status === "success" ? "text-ink" : "text-[#d64545]")}
              >
                {state.status === "success" && <Check className="size-4" />}
                {state.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <Magnetic strength={0.2}>
          <button
            type="submit"
            disabled={pending}
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              aria-hidden
              className="absolute inset-0 translate-y-full rounded-full bg-accent transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0 group-disabled:translate-y-full"
            />
            <span className="relative z-10">{pending ? "Sending…" : "Send message"}</span>
            {pending ? (
              <Loader2 className="relative z-10 size-4 animate-spin" />
            ) : (
              <ArrowUpRight className="relative z-10 size-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            )}
          </button>
        </Magnetic>
      </div>
    </form>
  );
}
