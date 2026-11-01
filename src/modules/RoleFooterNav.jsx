import React from "react";
import { getLangText } from "./i18n/indianLanguages";

export default function RoleFooterNav({
  activePortal,
  footerTab,
  setFooterTab,
  totalCartCount = 0,
  totalOrdersCount = 0,
  brightTheme = false,
  lang = "EN",
  customPortalTabs = null
}) {
  const t = getLangText(lang);
  const navConfig = {
    customer: [
      { id: "home", shortTag: "MKT", label: t.navStores || "Mega Market" },
      { id: "services", shortTag: "1HR", label: t.navServices || "Services" },
      { id: "carts", shortTag: "CRT", label: t.navCarts || "Carts", badge: totalCartCount },
      { id: "orders", shortTag: "ORD", label: t.navOrders || "Orders", badge: totalOrdersCount },
      { id: "account", shortTag: "ACC", label: t.navAccount || "Account" }
    ],
    merchant: [
      { id: "home", shortTag: "Q", label: t.navQueue || "1. Queue", badge: totalOrdersCount },
      { id: "stock", shortTag: "STK", label: t.navStock || "2. Stock" },
      { id: "add_brand", shortTag: "ADD", label: t.navAddBrand || "3. + Brand" },
      { id: "orders", shortTag: "INV", label: t.navInvoices || "4. Invoices" },
      { id: "account", shortTag: "ACC", label: t.navAccount || "Account" }
    ],
    service_provider: [
      { id: "home", shortTag: "JOB", label: t.navVisits || "1. Visits", badge: totalOrdersCount },
      { id: "slots", shortTag: "1HR", label: t.navSlots || "2. 1-Hr Slots" },
      { id: "add_service", shortTag: "FEE", label: t.navRateCard || "3. Rate Card" },
      { id: "orders", shortTag: "ESC", label: t.navEscrowBills || "4. Escrow" },
      { id: "account", shortTag: "ACC", label: t.navAccount || "Account" }
    ],
    decorator: [
      { id: "home", shortTag: "CAL", label: t.navHallCal || "1. Hall Cal" },
      { id: "bids", shortTag: "BID", label: t.navRevBids || "2. Rev Bids", badge: totalOrdersCount },
      { id: "escrow", shortTag: "35%", label: t.navMilestone || "3. 35%|85%" },
      { id: "portfolio", shortTag: "ALB", label: t.navPortfolio || "4. Portfolio" },
      { id: "account", shortTag: "ACC", label: t.navAccount || "Account" }
    ],
    rider: [
      { id: "home", shortTag: "RDR", label: t.navRadar || "1. Radar", badge: totalOrdersCount },
      { id: "batch", shortTag: "MAP", label: t.navRouteMap || "2. Route Map" },
      { id: "rates", shortTag: "KM", label: t.navKmRate || "3. Km Rate" },
      { id: "orders", shortTag: "ERN", label: t.navEarnings || "4. Earnings" },
      { id: "account", shortTag: "ACC", label: t.navAccount || "Account" }
    ]
  };

  const tabs = customPortalTabs || navConfig[activePortal] || navConfig.customer;
  return (
    <nav
      className={`sticky bottom-0 inset-x-0 z-40 grid grid-cols-5 border-t px-1 py-1.5 select-none ${
        brightTheme
          ? "bg-white border-slate-200 text-slate-800 shadow-lg"
          : "bg-slate-950 border-slate-800 text-slate-200 shadow-2xl"
      }`}
    >
      {tabs.map((tab) => {
        const active = footerTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFooterTab(tab.id)}
            className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
              active
                ? "bg-emerald-600 text-white font-black shadow"
                : "opacity-80 hover:opacity-100"
            }`}
          >
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                active ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-800"
              }`}
            >
              {tab.shortTag || "TAB"}
            </span>
            <span className="text-[9px] mt-0.5 truncate max-w-[85px]">{tab.label}</span>
            {tab.badge > 0 && (
              <span className="absolute top-0.5 right-2 bg-rose-600 text-white text-[8px] font-black px-1.5 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}