import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, XCircle, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info" | "warning";
export interface ToastItem {
  id: string;
  kind: ToastKind;
  msg: string;
}

const listeners = new Set<(t: ToastItem) => void>();

export const toast = {
  success: (msg: string) => emit("success", msg),
  error: (msg: string) => emit("error", msg),
  info: (msg: string) => emit("info", msg),
  warning: (msg: string) => emit("warning", msg),
};

function emit(kind: ToastKind, msg: string) {
  const t: ToastItem = { id: Math.random().toString(36).slice(2), kind, msg };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const l = (t: ToastItem) => {
      setItems((cur) => [...cur, t]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), 3800);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const Icon = (k: ToastKind) =>
    k === "success" ? CheckCircle2 : k === "error" ? XCircle : k === "warning" ? AlertCircle : Info;
  const colorOf = (k: ToastKind) =>
    k === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
    k === "error" ? "bg-red-50 border-red-200 text-red-800" :
    k === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" :
    "bg-blue-50 border-blue-200 text-blue-800";

  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-full">
      {items.map((t) => {
        const I = Icon(t.kind);
        return (
          <div
            key={t.id}
            className={`${colorOf(t.kind)} border rounded-xl px-4 py-3 shadow-lg flex items-start gap-3 animate-in slide-in-from-right-4`}
          >
            <I size={18} className="mt-0.5 flex-shrink-0" />
            <p className="text-sm flex-1">{t.msg}</p>
            <button onClick={() => setItems((cur) => cur.filter((x) => x.id !== t.id))}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
