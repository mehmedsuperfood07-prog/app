"use client";

import { createContext, useContext, useRef, useTransition } from "react";
import { useToast } from "@/components/toast";
import type { ActionResult } from "@/lib/actions/result";

const PendingContext = createContext(false);

// True while the enclosing ActionForm's action is in flight — lets a
// SubmitButton disable itself and show a spinner so a double tap can't
// fire the action twice.
export function useFormPending() {
  return useContext(PendingContext);
}

// A form that runs a Server Action without a page navigation: it shows a
// toast with the result, keeps the user's place on the page, and only
// clears the fields when told to (React's built-in form reset would also
// wipe the inputs after a *failed* submit, making people retype).
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirmMessage,
}: {
  action: (formData: FormData) => Promise<ActionResult | void>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirmMessage?: string;
}) {
  const [pending, startTransition] = useTransition();
  const { show } = useToast();
  // Synchronous guard: `pending` only flips after React re-renders, so two
  // submits fired in the same instant would both slip past a state check.
  const inFlight = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    inFlight.current = true;

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (!result) return;
        if (result.ok) {
          if (result.message) show(result.message, "success");
          if (resetOnSuccess) form.reset();
        } else {
          show(result.error, "error");
        }
      } catch {
        show("Couldn't reach the server. Check your connection and try again.", "error");
      } finally {
        inFlight.current = false;
      }
    });
  }

  return (
    <PendingContext.Provider value={pending}>
      <form onSubmit={handleSubmit} className={className}>
        {children}
      </form>
    </PendingContext.Provider>
  );
}
