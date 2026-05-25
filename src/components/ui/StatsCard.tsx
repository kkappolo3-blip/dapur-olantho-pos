import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "indigo";
  onClick?: () => void;
}

const toneClass: Record<string, string> = {
  default: "from-slate-50 to-white text-slate-700",
  success: "from-emerald-50 to-white text-emerald-700",
  warning: "from-amber-50 to-white text-amber-700",
  danger: "from-red-50 to-white text-red-700",
  info: "from-blue-50 to-white text-blue-700",
  indigo: "from-indigo-50 to-white text-indigo-700",
};

export function StatsCard({ icon, label, value, sub, tone = "default", onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`stat-card bg-gradient-to-br ${toneClass[tone]} ${onClick ? "cursor-pointer hover:scale-[1.01]" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
          {label}
        </span>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
