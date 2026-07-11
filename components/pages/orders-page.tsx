"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, MapPin, Package, Search, Truck, X } from "lucide-react";
import { EmptyState, PageSkeleton, SectionHeading, StatusBadge } from "@/components/ui-kit";
import { formatDate, formatMoney } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import type { Order } from "@/types";

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const query = trpc.orders.list.useQuery();

  const orders = useMemo(() => {
    const text = search.toLowerCase().trim();
    return (query.data ?? []).filter(
      order =>
        (!text ||
          [order.channelOrderId, order.foxwayReference ?? "", order.customerName ?? "", order.trackingCode ?? ""].some(value =>
            value.toLowerCase().includes(text),
          )) &&
        (status === "all" || order.status === status),
    );
  }, [query.data, search, status]);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  if (query.isLoading) return <PageSkeleton />;
  if (query.error) return <EmptyState title="Orders unavailable" description={query.error.message} />;

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Fulfillment"
        title="Orders"
        description="Follow bol.com orders from marketplace acceptance through Foxway dropshipping and final tracking."
      />

      <section className="panel overflow-hidden">
        <div className="grid gap-3 border-b border-[#232328] p-4 sm:grid-cols-[1fr_180px]">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#606068]" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search order, customer, supplier reference, or tracking"
              className="input-control w-full pl-9 pr-3"
            />
          </label>
          <select value={status} onChange={event => setStatus(event.target.value)} className="input-control px-3">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_process">In process</option>
            <option value="shipped">Shipped</option>
            <option value="cancelled">Cancelled</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Profit</th><th>Foxway</th><th>Status</th><th>Placed</th><th />
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open order ${order.channelOrderId}`}
                  onClick={() => setSelected(order)}
                  onKeyDown={event => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(order);
                    }
                  }}
                  className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF6B00]"
                >
                  <td className="ean-value text-[#FF6B00]">{order.channelOrderId}</td>
                  <td>{order.customerName ?? "—"}</td>
                  <td className="quantity-value">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td className="price-value">{formatMoney(order.totalSellCents)}</td>
                  <td className={`price-value ${order.profitCents >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>{formatMoney(order.profitCents)}</td>
                  <td><p className="ean-value">{order.foxwayReference ?? "Not sent"}</p><p className="mt-1 text-[11px] text-[#606068]">Stage {order.foxwayStatus ?? "—"}/5</p></td>
                  <td><StatusBadge status={order.status} /></td>
                  <td className="whitespace-nowrap text-[#606068]">{formatDate(order.createdAt)}</td>
                  <td><ChevronRight className="h-4 w-4 text-[#606068]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 ? <div className="p-5"><EmptyState title="No matching orders" description="New bol.com FBR orders will appear after the next order synchronization." /></div> : null}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button className="absolute inset-0 bg-black/75" onClick={() => setSelected(null)} aria-label="Close order details" />
          <aside role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="relative h-full w-full max-w-xl overflow-y-auto border-l border-[#232328] bg-[#141416] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="ui-label text-[#FF6B00]">Order details</p>
                <h2 id="order-detail-title" className="ean-value mt-2 text-xl font-semibold">{selected.channelOrderId}</h2>
                <p className="mt-1 text-[11px] text-[#A0A0A8]">Placed {formatDate(selected.createdAt)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-[8px] border border-[#2E2E35] p-2 text-[#A0A0A8] hover:bg-[#1A1A1E] hover:text-[#F0F0F0]" aria-label="Close order details">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="panel p-3"><p className="ui-label">Revenue</p><p className="price-value mt-2 text-[15px] font-semibold">{formatMoney(selected.totalSellCents)}</p></div>
              <div className="panel p-3"><p className="ui-label">Supplier cost</p><p className="price-value mt-2 text-[15px] font-semibold">{formatMoney(selected.totalCostCents)}</p></div>
              <div className="panel p-3"><p className="ui-label">Gross profit</p><p className={`price-value mt-2 text-[15px] font-semibold ${selected.profitCents >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>{formatMoney(selected.profitCents)}</p></div>
            </div>

            <section className="mt-6 border-t border-[#232328] pt-5">
              <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-[#FF6B00]" /><h3 className="text-[13px] font-semibold">Foxway fulfillment</h3></div>
              <p className="ean-value mt-2 text-[11px] text-[#A0A0A8]">{selected.foxwayReference ?? "Awaiting supplier order"}</p>
              <div className="mt-5 flex items-center">
                {[1, 2, 3, 4, 5].map((step, index) => (
                  <div key={step} className={`flex items-center ${index < 4 ? "flex-1" : ""}`}>
                    <span className={`quantity-value grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${selected.foxwayStatus && selected.foxwayStatus >= step ? "border-[#FF6B00] bg-[#FF6B0022] text-[#FF6B00]" : "border-[#2E2E35] bg-[#0C0C0E] text-[#606068]"}`}>{step}</span>
                    {index < 4 ? <span className={`h-px flex-1 ${selected.foxwayStatus && selected.foxwayStatus > step ? "bg-[#FF6B00]" : "bg-[#2E2E35]"}`} /> : null}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[#606068]"><span>Created</span><span>Accepted</span><span>Picking</span><span>Ready</span><span>Shipped</span></div>
              {selected.trackingCode ? <div className="mt-5 rounded-[8px] border border-[#22C55E33] bg-[#22C55E18] p-3"><p className="ui-label">Tracking</p><p className="ean-value mt-1 text-[12px] text-[#22C55E]">{selected.carrier ?? "Carrier"} · {selected.trackingCode}</p></div> : null}
            </section>

            <section className="mt-6 border-t border-[#232328] pt-5">
              <div className="flex items-center gap-2"><Package className="h-4 w-4 text-[#FF6B00]" /><h3 className="text-[13px] font-semibold">Items</h3></div>
              <div className="mt-3 space-y-2">
                {selected.items.map((item, index) => (
                  <div key={`${item.ean}-${index}`} className="rounded-[8px] border border-[#232328] bg-[#0C0C0E] p-3">
                    <div className="flex justify-between gap-3"><div><p className="text-[13px] font-medium">{item.productTitle}</p><p className="ean-value mt-1 text-[11px] text-[#606068]">{item.ean} · {item.supplierSku}</p></div><p className="price-value whitespace-nowrap text-[12px]">{item.quantity} × {formatMoney(item.unitSellCents)}</p></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 border-t border-[#232328] pt-5">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#FF6B00]" /><h3 className="text-[13px] font-semibold">Customer & address</h3></div>
              <p className="mt-3 text-[13px] font-medium">{selected.customerName ?? "—"}</p>
              <p className="mt-1 text-[12px] leading-5 text-[#A0A0A8]">{selected.shippingAddress.street} {selected.shippingAddress.houseNumber}{selected.shippingAddress.houseNumberExtension ?? ""}<br />{selected.shippingAddress.postalCode} {selected.shippingAddress.city}<br />{selected.shippingAddress.countryCode}</p>
            </section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
