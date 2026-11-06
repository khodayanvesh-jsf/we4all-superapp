import React from "react";

const ACTIONS = new Set(["services", "taxi", "parcel", "events", "labour", "stores"]);

export default function DynamicModuleRenderer({ module, onClose, onNavigate }) {
  if (!module) return null;
  const config = module.module_config && typeof module.module_config === "object" ? module.module_config : {};
  const components = Array.isArray(config.components) ? config.components.slice(0, 30) : [];

  return (
    <section className="bg-white text-slate-900 border border-emerald-300 rounded-2xl p-3 space-y-3">
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="text-[9px] uppercase tracking-wide font-black text-emerald-700">Founder-published module · v{module.version}</p>
          <h3 className="font-black text-sm">{module.icon || "▦"} {module.title}</h3>
          {module.description && <p className="text-[10px] text-slate-600 mt-1">{module.description}</p>}
        </div>
        <button type="button" onClick={onClose} className="text-slate-500 font-bold px-2 py-1">Close</button>
      </div>
      {components.map((component, index) => {
        if (!component || typeof component !== "object") return null;
        if (component.type === "text") {
          return <p key={component.id || index} className="text-xs text-slate-700">{String(component.text || "").slice(0, 500)}</p>;
        }
        if (component.type === "badge") {
          return <span key={component.id || index} className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-bold px-2 py-1">{String(component.label || "").slice(0, 60)}</span>;
        }
        if (component.type === "category_link") {
          return (
            <button key={component.id || index} type="button"
              onClick={() => onNavigate?.({ type: "category", categoryId: String(component.categoryId || "") })}
              className="w-full text-left rounded-xl border border-slate-200 p-2 text-xs font-bold hover:border-emerald-500">
              {String(component.label || "Browse category").slice(0, 80)} →
            </button>
          );
        }
        if (component.type === "action" && ACTIONS.has(String(component.action))) {
          return (
            <button key={component.id || index} type="button"
              onClick={() => onNavigate?.({ type: "tab", tab: String(component.action) })}
              className="w-full rounded-xl bg-emerald-700 text-white font-black py-2.5 text-xs">
              {String(component.label || "Open").slice(0, 80)} →
            </button>
          );
        }
        return null;
      })}
      {components.length === 0 && <p className="text-[10px] text-slate-500">This module has no published content yet.</p>}
    </section>
  );
}
