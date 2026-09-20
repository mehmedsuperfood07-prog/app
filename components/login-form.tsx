"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/mobile/submit-button";
import { login } from "@/lib/actions/auth";

const inputClasses =
  "w-full rounded-xl border border-zinc-300 bg-surface px-4 py-3 text-sm dark:border-zinc-700";

export function LoginForm({ notice }: { notice?: string }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <ActionForm action={login} className="space-y-4">
      {notice && (
        <p className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          {notice}
        </p>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={inputClasses}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</span>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className={`${inputClasses} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-100 dark:active:bg-zinc-800"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>

      <SubmitButton variant="bar" pendingLabel="Signing in…" className="mt-2">
        Sign in
      </SubmitButton>
    </ActionForm>
  );
}
