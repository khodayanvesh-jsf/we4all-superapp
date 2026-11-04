import React from "react";
import { getLangText } from "./i18n/indianLanguages";

export default function RoleFooterNav({
  activePortal,
  footerTab,
  setFooterTab,
  totalCartCount = 0,
  totalOrdersCount = 0,
  brightTheme = true,
  lang = "EN"
}) {
  const t = getLangText(lang);

  const ROLE_TABS = {
    customer: [
      { id: "home", icon: "\uD83C\uDFE0", label: t.stores },
      { id: "services", icon: "\uD83D\uDD27", label: t.services },
      { id: "carts", icon: "\uD83D\uDED2", label: `${t.carts} (${totalCartCount})` },
      { id: "orders", icon: "\uD83D\uDCE6", label: `${t.orders} (${totalOrdersCount})` },
      { id: "account", icon: "\uD83D\uDC64", label: t.account }
    ],
    merchant: [
      { id: "home", icon: "\uD83D\uDCE6", label: `Queue (${totalOrdersCount})` },
      { id: "stock", icon: "\uD83D\uDCCB", label: "Stock Manual" },
      { id: "add_brand", icon: "\u2795", label: "+ Add Brand" },
      { id: "orders", icon: "\uD83E\uDDFE", label: "GST Invoices" },
      { id: "account", icon: "\uD83D\uDC64", label: t.account }
    ],
    service_provider: [
      { id: "home", icon: "\uD83D\uDEE0\uFE0F", label: `Visits (${totalOrdersCount})` },
      { id: "slots", icon: "\u23F0", label: "1-Hr Slots" },
      { id: "add_service", icon: "\u2795", label: "Rate Card" },
      { id: "orders", icon: "\uD83E\uDDFE", label: "Escrow Bills" },
      { id: "account", icon: "\uD83D\uDC64", label: t.account }
    ],
    decorator: [
      { id: "home", icon: "\uD83C\uDFDB\uFE0F", label: "Hall Calendar" },
      { id: "bidding", icon: "\uD83D\uDD28", label: "Reverse Bids" },
      { id: "escrow", icon: "\uD83D\uDD12", label: "35%/85% Escrow" },
      { id: "portfolio", icon: "\uD83C\uDF38", label: "Portfolio" },
      { id: "account", icon: "\uD83D\uDC64", label: t.account }
    ],
    rider: [
      { id: "home", icon: "\uD83D\uDEF5", label: `Radar (${totalOrdersCount})` },
      { id: "map", icon: "\uD83D\uDDFA\uFE0F", label: "3-Pt Live Map" },
      { id: "batching", icon: "\u26A1", label: "Smart Batch" },
      { id: "orders", icon: "\u2B50", label: "Scorecard" },
      { id: "account", icon: "\uD83D\uDC64", label: t.account }
    ],
    labour: [
      { id: "home", icon: "\uD83E\uDDF1", label: `Muster (${totalOrdersCount})` },
      { id: "toli", icon: "\uD83D\uDC77", label: "Register Toli" },
      { id: "otp", icon: "\uD83D\uDD10", label: "2-Step OTP" },
      { id: "orders", icon: "\uD83D\uDCB0", label: "Daily Wages" },
      { id: "account", icon: "\uD83D\uDC64", label: t.account }
    ]
  };

  const tabsToRender = ROLE_TABS[activePortal] || ROLE_TABS.customer;

  return (
    <div
      className={`border-t px-1.5 py-1.5 grid grid-cols-5 gap-1 text-[10px] font-extrabold shrink-0 z-40 transition-colors ${
        brightTheme
          ? "bg-white border-slate-200 text-slate-600 shadow-lg"
          : "bg-slate-950 border-emerald-900/60 text-slate-400"
      }`}
    >
      {tabsToRender.map((tab) => {
        const isActive = footerTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFooterTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 rounded-xl cursor-pointer transition ${
              isActive
                ? "bg-emerald-600 text-white shadow-sm"
                : brightTheme
                ? "hover:bg-slate-100 text-slate-700"
                : "hover:bg-slate-900 text-slate-300"
            }`}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            <span className="mt-0.5 truncate max-w-full px-0.5">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}