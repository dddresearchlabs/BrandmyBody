"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { publicError } from "@/lib/public-error";

const fieldClass =
  "mt-1 w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [submitting, setSubmitting] = useState(false);

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Email is required");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (sendError) {
        setError(publicError(sendError, "Could not send login email"));
        setSubmitting(false);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(publicError(err, "Could not send login email"));
    }
    setSubmitting(false);
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    const token = code.trim();
    if (!token) {
      setError("Enter the 6-digit code from the email");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmed,
        token,
        type: "email",
      });
      if (verifyError) {
        setError(publicError(verifyError, "Could not verify code"));
        setSubmitting(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(publicError(err, "Could not verify code"));
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-10 grid gap-6">
      <form className="grid gap-4" onSubmit={sendLink}>
        <label className="text-sm">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-accent px-5 py-3 text-sm text-white hover:brightness-110 disabled:opacity-50"
        >
          {submitting && !sent ? "Sending…" : sent ? "Send again" : "Email me a login link"}
        </button>
      </form>

      {sent ? (
        <form className="grid gap-4 border-t border-line pt-6" onSubmit={verifyCode}>
          <p className="text-sm text-muted">
            Check your inbox for the link. For tests, paste the 6-digit code from
            the same email.
          </p>
          <label className="text-sm">
            Login code
            <input
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full border border-line px-5 py-3 text-sm hover:border-accent disabled:opacity-50"
          >
            {submitting ? "Verifying…" : "Sign in with code"}
          </button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-accent">{error}</p> : null}
    </div>
  );
}
