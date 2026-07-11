"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Boxes, ChevronLeft, ChevronRight, ClipboardList, FileClock, Menu, PackageSearch, RefreshCw, Settings, Store, X } from "lucide-react";
import { isClerkConfigured } from "@/lib/config";
import { trpc } from "@/lib/trpc/client";
import { AuthControls } from "./auth-controls";
import { Tooltip } from "./ui-kit";

const navigation: Array<{ href: Route; label: string; icon: typeof BarChart3 }> = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/catalog", label: "Catalog", icon: PackageSearch },
  { href: "/offers", label: "Offers", icon: Store },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/sync-log", label: "Sync Log", icon: FileClock },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[#FF6B00] text-[14px] font-extrabold text-black">R</span>{compact ? null : <div><p className="text-[14px] font-bold leading-4 text-[#F0F0F0]">Remobile Hub</p><p className="mt-1 text-[10px] leading-none text-[#606068]">Foxway · bol.com NL</p></div>}</div>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [syncMenuOpen, setSyncMenuOpen] = useState(false);
  const utils = trpc.useUtils();
  const syncMutation = trpc.sync.run.useMutation({ onSuccess: async () => { setSyncMenuOpen(false); await Promise.all([utils.dashboard.snapshot.invalidate(), utils.sync.logs.invalidate(), utils.offers.list.invalidate()]); } });

  const navItem = (item: typeof navigation[number], mobile = false) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return <Link key={item.href} href={item.href} onClick={() => mobile && setMobileOpen(false)} title={compact && !mobile ? item.label : undefined} className={`group flex min-h-10 items-center gap-3 rounded-[8px] px-3 text-[13px] font-medium ${active ? "bg-[#FF6B0022] text-[#FF6B00]" : "text-[#A0A0A8] hover:bg-[#1A1A1E] hover:text-[#F0F0F0]"}`}><Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#FF6B00]" : "text-[#606068] group-hover:text-[#A0A0A8]"}`} />{compact && !mobile ? null : <span>{item.label}</span>}</Link>;
  };

  return <div className="min-h-screen bg-[#0C0C0E]">
    <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[#232328] bg-[#141416] md:flex md:flex-col ${compact ? "w-[68px]" : "w-[220px]"}`}>
      <div className="flex h-[60px] items-center justify-between border-b border-[#232328] px-4"><Brand compact={compact} />{compact ? null : <Tooltip label="Collapse sidebar" side="bottom"><button onClick={() => setCompact(true)} className="rounded-[8px] p-1.5 text-[#606068] hover:bg-[#1A1A1E] hover:text-[#F0F0F0]" aria-label="Collapse sidebar"><ChevronLeft className="h-4 w-4" /></button></Tooltip>}</div>
      <nav className="flex-1 space-y-1 p-3">{navigation.map(item => navItem(item))}</nav>
      <div className="border-t border-[#232328] p-3">{compact ? <Tooltip label="Expand sidebar" side="top"><button onClick={() => setCompact(false)} className="grid h-10 w-full place-items-center rounded-[8px] text-[#606068] hover:bg-[#1A1A1E] hover:text-[#F0F0F0]" aria-label="Expand sidebar"><ChevronRight className="h-4 w-4" /></button></Tooltip> : <div className="rounded-[8px] border border-[#232328] bg-[#0C0C0E] p-3"><div className="flex items-center gap-2 text-[11px]"><span className="h-2 w-2 rounded-full bg-[#22C55E]" /><span className="text-[#A0A0A8]">Foxway</span><span className="ml-auto text-[#606068]">Demo</span></div><div className="mt-2.5 flex items-center gap-2 text-[11px]"><span className="h-2 w-2 rounded-full bg-[#22C55E]" /><span className="text-[#A0A0A8]">bol.com</span><span className="ml-auto text-[#606068]">Demo</span></div></div>}</div>
    </aside>

    {mobileOpen ? <div className="fixed inset-0 z-50 md:hidden"><button className="absolute inset-0 bg-black/75" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /><aside className="relative flex h-full w-[280px] flex-col border-r border-[#232328] bg-[#141416] p-3"><div className="mb-5 flex h-10 items-center justify-between px-1"><Brand /><button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="rounded-[8px] p-2 text-[#A0A0A8] hover:bg-[#1A1A1E]"><X className="h-5 w-5" /></button></div><nav className="space-y-1">{navigation.map(item => navItem(item, true))}</nav></aside></div> : null}

    <div className={compact ? "md:pl-[68px]" : "md:pl-[220px]"}>
      <header className="sticky top-0 z-30 flex h-[60px] items-center border-b border-[#232328] bg-[#141416] px-4 sm:px-6 lg:px-8">
        <button onClick={() => setMobileOpen(true)} className="mr-3 rounded-[8px] border border-[#2E2E35] p-2 text-[#A0A0A8] md:hidden" aria-label="Open navigation"><Menu className="h-4 w-4" /></button>
        <div className="hidden items-center gap-2 text-[11px] text-[#A0A0A8] sm:flex"><Boxes className="h-4 w-4 text-[#FF6B00]" /><span>Supplier → Marketplace</span><span className="rounded-[4px] bg-[#FF6B0022] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.05em] text-[#FF6B00]">Demo mode</span></div>
        <div className="ml-auto flex items-center gap-3"><div className="relative"><button onClick={() => setSyncMenuOpen(value => !value)} disabled={syncMutation.isPending} className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#FF6B00] px-3 text-[11px] font-semibold uppercase tracking-[.05em] text-black disabled:bg-[#303038] disabled:text-[#606068]"><RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />Sync now</button>{syncMenuOpen ? <div className="absolute right-0 top-11 w-48 rounded-[12px] border border-[#232328] bg-[#141416] p-1.5 shadow-2xl"><p className="ui-label px-2 pb-1.5 pt-1">Run synchronization</p>{(["catalog", "price_stock", "orders"] as const).map(type => <button key={type} onClick={() => syncMutation.mutate({ type })} className="w-full rounded-[8px] px-2 py-2 text-left text-[12px] text-[#A0A0A8] hover:bg-[#1A1A1E] hover:text-[#F0F0F0]">{type === "price_stock" ? "Price & stock" : type[0]?.toUpperCase() + type.slice(1)}</button>)}</div> : null}</div>{isClerkConfigured ? <AuthControls /> : <span className="grid h-8 w-8 place-items-center rounded-full border border-[#FF6B0044] bg-[#FF6B0022] text-[10px] font-bold text-[#FF6B00]">DO</span>}</div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  </div>;
}
