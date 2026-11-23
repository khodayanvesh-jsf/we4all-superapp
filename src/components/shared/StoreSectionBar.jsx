import React, { useEffect, useState } from "react";

export function StoreSectionBar({ onSelectCategory }) {
  const [section, setSection] = useState("all");

  useEffect(() => {
    const onOpen = (evt) => {
      const sec = evt?.detail?.section || "all";
      const cat = evt?.detail?.category || "";
      setSection(sec);
      if (cat && typeof onSelectCategory === "function") {
        try { onSelectCategory(cat); } catch {}
      }
    };
    window.addEventListener("we4all:open-store-section", onOpen);
    return () => window.removeEventListener("we4all:open-store-section", onOpen);
  }, [onSelectCategory]);

  const pick = (sec, cat) => {
    setSection(sec);
    if (typeof onSelectCategory === "function") {
      try { onSelectCategory(cat); } catch {}
    }
    try {
      window.dispatchEvent(new CustomEvent("we4all:store-section-selected", { detail: { section: sec, category: cat } }));
    } catch {}
  };

  return (
    <div id="we4all-store-section-bar" className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-900/90 p-1.5 border border-indigo-500/30 mb-2">
      <button
        type="button"
        onClick={() => pick("groceries", "Groceries & Kirana")}
        className={"rounded-xl py-2 px-2 text-xs font-extrabold transition cursor-pointer " + (section === "groceries" ? "we4all-pill-active" : "bg-slate-800/80 text-slate-200 hover:bg-slate-700")}
      >
        🛒 Groceries
      </button>
      <button
        type="button"
        onClick={() => pick("foods", "Fresh Meat & Fish")}
        className={"rounded-xl py-2 px-2 text-xs font-extrabold transition cursor-pointer " + (section === "foods" ? "we4all-pill-active" : "bg-slate-800/80 text-slate-200 hover:bg-slate-700")}
      >
        🍛 Foods Veg &amp; Non-Veg
      </button>
      <button
        type="button"
        onClick={() => pick("all", "All")}
        className={"rounded-xl py-2 px-2 text-xs font-extrabold transition cursor-pointer " + (section === "all" ? "we4all-pill-active" : "bg-slate-800/80 text-slate-200 hover:bg-slate-700")}
      >
        ✨ All Stores
      </button>
    </div>
  );
}

export default StoreSectionBar;