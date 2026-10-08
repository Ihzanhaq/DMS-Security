"use client";

import { type FormEvent, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Eye, EyeOff, Shield } from "lucide-react";
import { Field, inputClass } from "@/components/ui-kit";
import { useToast } from "@/components/shared/toast-context";
import { DEMO_PASSWORD, type AccessUser } from "@/lib/access";
import { APP_TODAY } from "@/lib/app-date";
import { APP_NAME } from "@/lib/labels";
import { cn } from "@/lib/utils";

const digits = (value: string) => value.replace(/\D/g, "");

/** Email, phone or employee ID — whichever the person typed. */
export function findLoginUser(users: AccessUser[], identifier: string) {
  const typed = identifier.trim().toLowerCase();
  if (!typed) return undefined;
  const typedDigits = digits(typed);
  return users.find(user => user.status === "active" && (
    (user.email && user.email.toLowerCase() === typed)
    || (typedDigits.length >= 10 && digits(user.phone).endsWith(typedDigits.slice(-10)))
    || user.employeeId?.toLowerCase() === typed
  ));
}

export function LoginScreen({
  users,
  onSignIn,
}: {
  users: AccessUser[];
  onSignIn: (userId: string, remember: boolean) => void;
}) {
  const notify = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const tween = gsap.from(cardRef.current, { y: 12, opacity: 0, duration: 0.35, ease: "power2.out" });
    return () => { tween.revert(); };
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!form.identifier.trim()) next.identifier = "Email, phone or employee ID is required";
    if (!form.password) next.password = "Password is required";
    if (!next.identifier) {
      const user = findLoginUser(users, form.identifier);
      if (!user) next.identifier = "No active account matches this email, phone or employee ID";
      else if (form.password && form.password !== DEMO_PASSWORD) next.password = "Incorrect password";
      else if (!next.password) {
        setErrors({});
        onSignIn(user.id, remember);
        return;
      }
    }
    setErrors(next);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4 text-foreground">
      <div
        ref={cardRef}
        className="grid w-full max-w-[820px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl md:grid-cols-2"
      >
        {/* Left: form */}
        <div className="flex flex-col justify-center px-6 py-7 sm:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[330px]">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald/10" aria-hidden>
                <Shield className="h-[18px] w-[18px] text-emerald" />
              </span>
              <span className="text-base font-semibold">{APP_NAME}</span>
            </div>

            <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
            <p className="mt-1 text-[13px] text-muted">to continue to {APP_NAME}</p>

            <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-3">
              <Field label="Email, phone or employee ID" required>
                <input
                  className={cn(inputClass, "h-10", errors.identifier && "border-status-danger")}
                  value={form.identifier}
                  onChange={event => setForm({ ...form, identifier: event.target.value })}
                  placeholder="you@bmgsecurity.in"
                  autoComplete="username"
                  autoFocus
                />
                {errors.identifier && <small className="mt-1 block text-xs text-status-danger">{errors.identifier}</small>}
              </Field>
              <Field label="Password" required>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    className={cn(inputClass, "h-10 pr-10", errors.password && "border-status-danger")}
                    value={form.password}
                    onChange={event => setForm({ ...form, password: event.target.value })}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(value => !value)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <small className="mt-1 block text-xs text-status-danger">{errors.password}</small>}
              </Field>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-muted">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={event => setRemember(event.target.checked)}
                    className="h-4 w-4 rounded border-border accent-emerald"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => notify({ message: "Ask your administrator to reset your password.", kind: "info" })}
                  className="text-[13px] font-medium text-emerald hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="mt-0.5 h-10 w-full rounded-lg bg-emerald text-sm font-semibold text-white transition-colors hover:bg-[#00aa67]"
              >
                Sign in
              </button>
            </form>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted">or sign in using</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="mt-3.5 flex justify-center gap-3">
              {(["Google", "Microsoft"] as const).map(provider => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => notify({ message: `${provider} sign-in connects once the live backend is set up.`, kind: "info" })}
                  aria-label={`Sign in with ${provider}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-surface"
                >
                  {provider === "Google" ? <GoogleGlyph /> : <MicrosoftGlyph />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: soft illustrated panel */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#e8f7ef] via-[#dbf1e6] to-[#eff8f4] [.dark_&]:from-[#0b2b26] [.dark_&]:via-[#10372e] [.dark_&]:to-[#0d2034] md:block">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/40 blur-2xl [.dark_&]:bg-emerald/5" />
          <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-[#bfe8d3]/50 blur-2xl [.dark_&]:bg-emerald/10" />
          <div className="relative flex h-full flex-col items-center justify-center p-8 text-center">
            {/* Stylised duty board */}
            <div className="w-full max-w-[250px] rounded-2xl border border-white/70 bg-white/85 p-3.5 shadow-lg backdrop-blur-sm [.dark_&]:border-border [.dark_&]:bg-card/85">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 flex h-14 items-center justify-center rounded-lg bg-gradient-to-r from-[#00b878] to-[#4fd6a3]">
                  <Shield className="h-6 w-6 text-white/90" />
                </div>
                <div className="h-14 rounded-lg bg-[#e4f4ec] [.dark_&]:bg-emerald/10" />
                {[0, 1, 2].map(row => (
                  <div key={row} className="col-span-3 flex items-center gap-2">
                    <span className="h-5 w-5 shrink-0 rounded-full bg-[#d8efe3] [.dark_&]:bg-emerald/15" />
                    <span className="h-2.5 flex-1 rounded bg-[#e4f4ec] [.dark_&]:bg-emerald/10" />
                    <span className={cn("h-2.5 w-8 rounded-full", row === 1 ? "bg-[#febc2e]" : "bg-[#00b878]")} />
                  </div>
                ))}
                <div className="col-span-3 mt-1 flex items-end gap-1.5">
                  {[40, 62, 30, 76, 52, 68].map((height, index) => (
                    <div
                      key={index}
                      className={cn("flex-1 rounded-t", index % 2 ? "bg-[#8fddba]" : "bg-[#00b878]")}
                      style={{ height }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <h3 className="mt-7 text-lg font-semibold text-foreground">Every site, every shift, one place</h3>
            <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted">
              Deployment, attendance, payroll, inventory &amp; compliance for your security workforce.
            </p>
          </div>
        </div>
      </div>

      <p className="fixed bottom-3 text-xs text-muted">
        © {APP_TODAY.slice(0, 4)} Fist Innovations · {APP_NAME}
      </p>
    </div>
  );
}

function MicrosoftGlyph() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}
