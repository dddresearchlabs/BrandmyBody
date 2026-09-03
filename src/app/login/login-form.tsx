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
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [busy, setBusy] = useState<"password" | "otp" | "verify" | null>(null);

  async function signInWithPassword(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    setError(null);
    setBusy("password");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (signInError) {
        setError(publicError(signInError, "Could not sign in"));
        setBusy(null);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(publicError(err, "Could not sign in"));
      setBusy(null);
    }
  }

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Email is required");
      return;
    }
    setError(null);
    setBusy("otp");
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      document.cookie = `bmb-next=${next}; Path=/; Max-Age=900; SameSite=Lax${
        window.location.protocol === "https:" ? "; Secure" : ""
      }`;
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (sendError) {
        setError(publicError(sendError, "Could not send login email"));
        setBusy(null);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(publicError(err, "Could not send login email"));
    }
    setBusy(null);
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
    setBusy("verify");
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmed,
        token,
        type: "email",
      });
      if (verifyError) {
        setError(publicError(verifyError, "Could not verify code"));
        setBusy(null);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(publicError(err, "Could not verify code"));
      setBusy(null);
    }
  }

  return (
    <div className="mt-10 grid gap-8">
      <form className="grid gap-4" onSubmit={signInWithPassword}>
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
        <label className="text-sm">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
          />
        </label>
        <button
          type="submit"
          disabled={busy !== null}
          className="rounded-full bg-accent px-5 py-3 text-sm text-white hover:brightness-110 disabled:opacity-50"
        >
          {busy === "password" ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-xs leading-5 text-muted">
          By signing in you agree to the{" "}
          <a href="/terms" className="text-accent hover:underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-accent hover:underline">
            Privacy
          </a>
          .
        </p>
      </form>

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      <div className="grid gap-4 border-t border-line pt-8">
        <p className="text-sm text-muted">
          Or email a magic link. Use the link or the 6-digit code for tests.
        </p>
        <form className="grid gap-4" onSubmit={sendLink}>
          <button
            type="submit"
            disabled={busy !== null}
            className="rounded-full border border-line px-5 py-3 text-sm hover:border-accent disabled:opacity-50"
          >
            {busy === "otp" ? "Sending…" : sent ? "Send again" : "Email me a login link"}
          </button>
        </form>

        {sent ? (
          <form className="grid gap-4" onSubmit={verifyCode}>
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
              disabled={busy !== null}
              className="rounded-full border border-line px-5 py-3 text-sm hover:border-accent disabled:opacity-50"
            >
              {busy === "verify" ? "Verifying…" : "Sign in with code"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
