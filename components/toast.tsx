"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

type Kind = "success" | "error";
type ToastState = { id: number; message: string; kind: Kind };

const ToastContext = createContext<{ show: (message: string, kind?: Kind) => void }>({
  show: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((message: string, kind: Kind = "success") => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, kind });
    timer.current = window.setTimeout(() => setToast(null), kind === "error" ? 5500 : 3000);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4"
        style={{ paddingTop: "calc(var(--safe-top) + 0.75rem)" }}
      >
        {toast && (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={`animate-toast pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.kind === "error"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-accent text-accent-foreground"
            }`}
          >
            {toast.kind === "error" ? (
              <CircleAlert size={18} className="mt-px shrink-0" />
            ) : (
              <CircleCheck size={18} className="mt-px shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
