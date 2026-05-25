import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster, toast } from "@/components/ui/Toast";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import type { Order, Backorder, Sale } from "@/types/db";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-slate-500">
          Halaman yang Anda cari tidak ada.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn btn-primary">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm text-slate-500">{error.message}</p>
        <div className="mt-6 flex gap-2 justify-center">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn btn-primary"
          >
            Coba lagi
          </button>
          <a href="/" className="btn btn-ghost">
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dapur Olantho — Manajemen Toko" },
      {
        name: "description",
        content:
          "Sistem POS dan manajemen inventori Dapur Olantho. Pesan, terima, jual, closing — semua di satu tempat.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}

function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sbOpen, setSbOpen] = useState(false);

  const { data: orders } = useSupabaseData<Order>("orders");
  const { data: backorders } = useSupabaseData<Backorder>("backorders");
  const { data: sales } = useSupabaseData<Sale>("sales");

  const badges = {
    rencana: orders.filter((o) => o.status === "Rencana").length,
    dipesan: orders.filter((o) => o.status === "Dipesan").length,
    dikirim: orders.filter((o) => o.status === "Dikirim").length,
    backorder: backorders.filter((b) => b.status === "Menunggu").length,
    cicilan: sales.filter(
      (s) => s.cara_bayar === "cicilan" && (s.cicil_bayar || 0) < (s.total_jual || 0),
    ).length,
  };

  useEffect(() => {
    const onSync = (e: any) => {
      const n = e?.detail?.count || 0;
      if (n > 0) toast.success(`${n} data tersinkronisasi`);
    };
    window.addEventListener("dapur-sync", onSync as any);
    return () => window.removeEventListener("dapur-sync", onSync as any);
  }, []);

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar open={sbOpen} onClose={() => setSbOpen(false)} badges={badges} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenu={() => setSbOpen(true)} pathname={pathname} />
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
