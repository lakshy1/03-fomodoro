"use client";

import { createContext, useCallback, useContext, useState } from "react";
import LoadingButton from "./LoadingButton";

type ToastType = "success" | "error" | "info";
type ToastActionVariant = "primary" | "glass" | "ghost";
type ToastAction = { label: string; onClick?: () => void; variant?: ToastActionVariant };
type Toast = {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  actions?: ToastAction[];
  durationMs?: number;
};

type ToastContextValue = {
  push: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue>({ push: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((t) => [...t, { ...toast, id }]);
    const duration = toast.durationMs ?? 3200;
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-msg">{t.message}</div>}
            {t.actions && t.actions.length > 0 && (
              <div className="toast-actions">
                {t.actions.map((a, i) => (
                  <LoadingButton
                    key={`${t.id}-a-${i}`}
                    onClick={() => {
                      a.onClick?.();
                      setToasts((prev) => prev.filter((x) => x.id !== t.id));
                    }}
                    className={`toast-btn fomo-btn ${a.variant ? `fomo-btn-${a.variant}` : "fomo-btn-glass"}`}
                  >
                    {a.label}
                  </LoadingButton>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
