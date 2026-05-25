import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  requireCode?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  danger,
  requireCode,
  onConfirm,
  onCancel,
}: Props) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setErr("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (requireCode && code !== requireCode) {
      setErr("Kode salah");
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="card max-w-md w-full p-6 animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        {message && <p className="text-sm text-slate-600 mb-4">{message}</p>}
        {requireCode && (
          <div className="mb-4">
            <label className="label">Masukkan kode konfirmasi</label>
            <input
              ref={inputRef}
              className="input"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Kode..."
            />
            {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={submit}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
