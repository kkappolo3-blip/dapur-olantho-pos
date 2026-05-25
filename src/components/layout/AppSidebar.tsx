import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  PackageCheck,
  Receipt,
  FileSpreadsheet,
  PieChart,
  PackageX,
  CreditCard,
  Wallet,
  Boxes,
  HandCoins,
  Store,
  History,
  Settings,
  X,
} from "lucide-react";

interface MenuItem {
  to: string;
  label: string;
  icon: any;
  step?: number;
  badge?: { count: number; tone: "amber" | "danger" | "indigo" };
  section?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  badges: {
    rencana: number;
    dipesan: number;
    dikirim: number;
    backorder: number;
    cicilan: number;
  };
}

export function AppSidebar({ open, onClose, badges }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items: (MenuItem | { section: string })[] = [
    { section: "Dashboard" },
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { section: "Alur Jualan" },
    {
      to: "/pesan-barang",
      label: "Pesan Barang",
      icon: ShoppingCart,
      step: 1,
      badge:
        badges.rencana + badges.dipesan > 0
          ? { count: badges.rencana + badges.dipesan, tone: "amber" }
          : undefined,
    },
    {
      to: "/terima-barang",
      label: "Terima Barang",
      icon: PackageCheck,
      step: 2,
      badge: badges.dikirim > 0 ? { count: badges.dikirim, tone: "indigo" } : undefined,
    },
    { to: "/catat-penjualan", label: "Catat Penjualan", icon: Receipt, step: 3 },
    { to: "/closing", label: "Closing", icon: FileSpreadsheet, step: 4 },
    { to: "/pembagian-laba", label: "Pembagian Laba", icon: PieChart, step: 5 },
    {
      to: "/pesanan-tanpa-stok",
      label: "Pesanan Tanpa Stok",
      icon: PackageX,
      step: 6,
      badge: badges.backorder > 0 ? { count: badges.backorder, tone: "danger" } : undefined,
    },
    { section: "Manajemen" },
    {
      to: "/pelanggan-cicilan",
      label: "Pelanggan Cicilan",
      icon: CreditCard,
      badge: badges.cicilan > 0 ? { count: badges.cicilan, tone: "danger" } : undefined,
    },
    { to: "/modal-talangan", label: "Modal Talangan", icon: Wallet },
    { to: "/stok-barang", label: "Stok Barang", icon: Boxes },
    { to: "/biaya-operasional", label: "Biaya Operasional", icon: HandCoins },
    { to: "/daftar-suplier", label: "Daftar Suplier", icon: Store },
    { to: "/riwayat", label: "Riwayat", icon: History },
    { to: "/pengaturan", label: "Pengaturan", icon: Settings },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-slate-900/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-[100] w-[270px] bg-white border-r flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-lg">
                🍳
              </span>
              Dapur Olantho
            </h1>
            <p className="text-[10px] tracking-widest uppercase text-amber-500 font-bold mt-1 ml-11">
              Manajemen Toko v3.10
            </p>
          </div>
          <button className="lg:hidden text-slate-500" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {items.map((it, i) => {
            if ("section" in it) {
              return (
                <div
                  key={"s" + i}
                  className="px-5 pt-4 pb-1 text-[10px] uppercase tracking-widest font-bold text-slate-400"
                >
                  {it.section}
                </div>
              );
            }
            const Icon = it.icon;
            const active = pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium border-l-[3px] transition-colors ${
                  active
                    ? "border-amber-500 bg-indigo-50 text-indigo-700"
                    : "border-transparent text-slate-700 hover:bg-slate-50"
                }`}
              >
                {it.step ? (
                  <span className="w-[22px] h-[22px] rounded-full bg-amber-400 text-white text-[11px] font-extrabold flex items-center justify-center flex-shrink-0">
                    {it.step}
                  </span>
                ) : (
                  <Icon size={17} className="text-slate-500" />
                )}
                <span className="flex-1 truncate">{it.label}</span>
                {it.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      it.badge.tone === "danger"
                        ? "bg-red-500 text-white"
                        : it.badge.tone === "amber"
                          ? "bg-amber-400 text-white"
                          : "bg-indigo-500 text-white"
                    }`}
                  >
                    {it.badge.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4 text-[11px] text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-700 mb-1">Pengembang</p>
          <p>🎬 Gibikey Studio</p>
          <p>👤 Kaka Gibikey Khair</p>
          <p>📱 0851-7307-2160 (WA)</p>
          <p>🌐 FB: Kaka Gibikey Khair</p>
          <p className="mt-2 pt-2 border-t text-slate-400">
            💾 Data tersimpan di cloud (Supabase)
          </p>
        </div>
      </aside>
    </>
  );
}
