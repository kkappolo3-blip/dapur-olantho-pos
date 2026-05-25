import { Menu, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useConnection } from "@/hooks/useConnection";

const titles: Record<string, { title: string; step?: number }> = {
  "/": { title: "Dashboard" },
  "/pesan-barang": { title: "Pesan Barang", step: 1 },
  "/terima-barang": { title: "Terima Barang", step: 2 },
  "/catat-penjualan": { title: "Catat Penjualan", step: 3 },
  "/closing": { title: "Closing", step: 4 },
  "/pembagian-laba": { title: "Pembagian Laba", step: 5 },
  "/pesanan-tanpa-stok": { title: "Pesanan Tanpa Stok", step: 6 },
  "/pelanggan-cicilan": { title: "Pelanggan Cicilan" },
  "/modal-talangan": { title: "Modal Talangan" },
  "/stok-barang": { title: "Stok Barang" },
  "/biaya-operasional": { title: "Biaya Operasional" },
  "/daftar-suplier": { title: "Daftar Suplier" },
  "/riwayat": { title: "Riwayat" },
  "/pengaturan": { title: "Pengaturan" },
};

export function Topbar({
  onMenu,
  pathname,
}: {
  onMenu: () => void;
  pathname: string;
}) {
  const { status, queueCount, lastSync } = useConnection();
  const info = titles[pathname] || { title: "Dapur Olantho" };

  const dateStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
        <button
          className="lg:hidden p-2 -ml-2 text-slate-600"
          onClick={onMenu}
          aria-label="Menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {info.step && (
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-white text-sm font-extrabold flex items-center justify-center flex-shrink-0">
              {info.step}
            </span>
          )}
          <h2 className="font-bold text-base sm:text-lg truncate">{info.title}</h2>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="hidden md:block text-slate-500">{dateStr}</div>
          <SyncBadge status={status} queueCount={queueCount} lastSync={lastSync} />
        </div>
      </div>
    </header>
  );
}

function SyncBadge({
  status,
  queueCount,
  lastSync,
}: {
  status: "online" | "offline" | "syncing";
  queueCount: number;
  lastSync: Date | null;
}) {
  if (status === "syncing") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700">
        <RefreshCw size={13} className="spin-slow" />
        <span className="font-semibold">Syncing</span>
      </div>
    );
  }
  if (status === "offline") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700">
        <WifiOff size={13} />
        <span className="font-semibold">Offline</span>
        {queueCount > 0 && (
          <span className="ml-1 px-1.5 rounded bg-red-500 text-white text-[10px]">
            {queueCount}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700">
      <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
      <Wifi size={13} />
      <span className="font-semibold hidden sm:inline">Online</span>
      {lastSync && (
        <span className="hidden md:inline text-emerald-600/70 ml-1">
          {lastSync.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
