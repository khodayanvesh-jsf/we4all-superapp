import React from "react";

export default function RoleFooterNav({
  activePortal,
  footerTab,
  setFooterTab,
  totalCartCount = 0,
  totalOrdersCount = 0,
  brightTheme = false
}) {
  const navConfig = {
    customer: [
      { id: "home", icon: "\uD83C\uDFEA", label: "Stores" },
      { id: "services", icon: "\uD83D\uDEE0\uFE0F", label: "Services" },
      { id: "carts", icon: "\uD83D\uDED2", label: "Carts", badge: totalCartCount },
      { id: "orders", icon: "\uD83D\uDCE6", label: "Orders", badge: totalOrdersCount },
      { id: "account", icon: "\uD83D\uDC64", label: "Account" }
    ],
    merchant: [
      { id: "home", icon: "\uD83D\uDCE5", label: "1. Queue", badge: totalOrdersCount },
      { id: "stock", icon: "\uD83D\uDCCB", label: "2. Stock Manual" },
      { id: "add_brand", icon: "\u2795", label: "3. + Add Brand" },
      { id: "orders", icon: "\uD83E\uDDFE", label: "4. Invoices" },
      { id: "account", icon: "\uD83D\uDC64", label: "Account" }
    ],
    service_provider: [
      { id: "home", icon: "\uD83D\uDCCD", label: "1. Visits", badge: totalOrdersCount },
      { id: "slots", icon: "\u23F0", label: "2. 1-Hr Slots" },
      { id: "add_service", icon: "\uD83D\uDCB3", label: "3. Rate Card" },
      { id: "orders", icon: "\uD83E\uDDFE", label: "4. Escrow Bills" },
      { id: "account", icon: "\uD83D\uDC64", label: "Account" }
    ],
    decorator: [
      { id: "home", icon: "\uD83C\uDFAA", label: "1. Hall Calendar" },
      { id: "bids", icon: "\uD83D\uDCB0", label: "2. Reverse Bids", badge: totalOrdersCount },
      { id: "escrow", icon: "\uD83D\uDEE1\uFE0F", label: "3. 35%|85% Esc." },
      { id: "portfolio", icon: "\uD83D\uDCF8", label: "4. Portfolio" },
      { id: "account", icon: "\uD83D\uDC64", label: "Account" }
    ],
    rider: [
      { id: "home", icon: "\uD83D\uDEF5", label: "1. Radar", badge: totalOrdersCount },
      { id: "batch", icon: "\uD83D\uDDFA\uFE0F", label: "2. Route Map" },
      { id: "rates", icon: "\u26FD", label: "3. Km Rate" },
      { id: "orders", icon: "\uD83E\uDDFE", label: "4. Earnings" },
      { id: "account", icon: "\uD83D\uDC64", label: "Account" }
    ]
  };

  const tabs = navConfig[activePortal] || navConfig.customer;

  return (
    <nav
      className={`absolute bottom-0 inset-x-0 z-40 grid grid-cols-5 border-t px-1 py-1.5 select-none ${
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
                ? "bg-emerald-500/20 text-emerald-400 font-black"
                : "opacity-75 hover:opacity-100"
            }`}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            <span className="text-[9px] mt-1 truncate max-w-[68px]">{tab.label}</span>
            {tab.badge > 0 && (
              <span className="absolute top-0.5 right-2 bg-amber-400 text-slate-950 text-[8px] font-black px-1.5 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}