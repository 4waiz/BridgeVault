"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "success" | "error";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  variant: Variant;
  leadId?: string;
  createdAt: number;
}

interface NotificationsContextValue {
  push: (n: Omit<AppNotification, "id" | "createdAt">) => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  push: () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

const VISIBLE_MS = 1500;
const FADE_MS = 600;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map());

  const removeNow = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    setLeavingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const timers = timersRef.current.get(id);
    if (timers) timers.forEach(clearTimeout);
    timersRef.current.delete(id);
  }, []);

  const beginLeave = useCallback(
    (id: string) => {
      setLeavingIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      const t = setTimeout(() => removeNow(id), FADE_MS);
      const timers = timersRef.current.get(id) ?? [];
      timers.push(t);
      timersRef.current.set(id, timers);
    },
    [removeNow]
  );

  const push = useCallback<NotificationsContextValue["push"]>(
    (n) => {
      const id = crypto.randomUUID();
      const full: AppNotification = { ...n, id, createdAt: Date.now() };
      setItems((prev) => [full, ...prev].slice(0, 4));
      const t = setTimeout(() => beginLeave(id), VISIBLE_MS);
      timersRef.current.set(id, [t]);
    },
    [beginLeave]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((arr) => arr.forEach(clearTimeout));
      timers.clear();
    };
  }, []);

  function handleClick(n: AppNotification) {
    if (n.leadId) router.push(`/leads/${n.leadId}`);
    removeNow(n.id);
  }

  return (
    <NotificationsContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 inset-x-0 z-60 flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        {items.map((n) => {
          const leaving = leavingIds.has(n.id);
          return (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClick(n);
                }
              }}
              className={cn(
                "pointer-events-auto w-full max-w-sm text-left",
                "flex items-start gap-3 px-4 py-3.5 rounded-3xl",
                "bg-panel-2/95 backdrop-blur border border-border shadow-xl",
                "hover:border-brand/40 transition-colors cursor-pointer",
                leaving ? "animate-notif-out" : "animate-notif-in"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  n.variant === "success"
                    ? "bg-brand text-white"
                    : "bg-danger text-white"
                )}
              >
                {n.variant === "success" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="font-semibold text-text">BridgeVault</span>
                  <span aria-hidden>·</span>
                  <span>now</span>
                </div>
                <div className="mt-0.5 text-sm font-semibold text-text truncate">
                  {n.title}
                </div>
                <div className="text-xs text-text-muted truncate">{n.body}</div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNow(n.id);
                }}
                className="shrink-0 p-1 -m-1 rounded-full text-text-muted hover:text-text cursor-pointer"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationsContext.Provider>
  );
}
