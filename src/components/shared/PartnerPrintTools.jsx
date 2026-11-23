import React, { useState } from "react";

/**
 * Decorator Printable Quote & Advance Invoice PDF (35% >= 5 days / 85% < 5 days) + WhatsApp Share
 */
export function DecoratorQuotePdfWidget({ decoratorName = "WE4ALL Verified Decorator" }) {
  const [customerName, setCustomerName] = useState("");
  const [hallOrPackage, setHallOrPackage] = useState("Wedding Stage & Lighting Package");
  const [eventDate, setEventDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("45000");

  const daysAway = (() => {
    if (!eventDate) return 10;
    const diff = (new Date(eventDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return Math.ceil(diff);
  })();
  const total = Math.max(0, Number(totalAmount) || 0);
  const advancePct = daysAway >= 5 ? 35 : 85;
  const advanceAmt = Math.round((total * advancePct) / 100);
  const balanceAmt = Math.max(0, total - advanceAmt);

  const openPrintablePdf = () => {
    const w = window.open("", "_blank", "width=760,height=920");
    if (!w) return;
    const html = `<!doctype html><html><head><title>WE4ALL Quote - ${hallOrPackage}</title>
    <style>body{font-family:Segoe UI,Arial,sans-serif;padding:28px;color:#0f172a}
    .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #4f46e5;padding-bottom:12px;margin-bottom:20px}
    .brand{font-size:22px;font-weight:800;color:#4f46e5}.meta{font-size:12px;color:#475569;text-align:right}
    table{width:100%;border-collapse:collapse;margin:18px 0}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:13px}
    th{background:#f1f5f9}.tot{font-weight:800;background:#eef2ff}.note{font-size:11px;color:#475569;margin-top:16px}
    @media print{.noprint{display:none}}</style></head><body>
    <div class="hdr"><div><div class="brand">WE4ALL Events &amp; Decor</div><div>${decoratorName}</div></div>
    <div class="meta"><strong>QUOTE / ADVANCE INVOICE</strong><br/>Date: ${new Date().toLocaleDateString("en-IN")}<br/>Event Date: ${eventDate || "TBD"}</div></div>
    <div><strong>Customer:</strong> ${customerName || "Valued Customer"}</div>
    <table><thead><tr><th>Description</th><th>Rule</th><th>Amount (INR)</th></tr></thead><tbody>
    <tr><td>${hallOrPackage}</td><td>Total Agreed Package</td><td>₹${total.toLocaleString("en-IN")}</td></tr>
    <tr class="tot"><td>Booking Advance Payable Now</td><td>${advancePct}% (${daysAway >= 5 ? "5+ days before event" : "Under 5 days before event"})</td><td>₹${advanceAmt.toLocaleString("en-IN")}</td></tr>
    <tr><td>Balance on Event Day</td><td>Remaining ${100 - advancePct}%</td><td>₹${balanceAmt.toLocaleString("en-IN")}</td></tr>
    </tbody></table>
    <div class="note">Generated via WE4ALL Super-App · Zero Platform Markup · Save as PDF using Print dialog.</div>
    <button class="noprint" onclick="window.print()" style="margin-top:16px;padding:10px 18px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">🖨️ Print / Save as PDF</button>
    </body></html>`;
    w.document.write(html);
    w.document.close();
  };

  const shareWhatsApp = () => {
    const msg = `WE4ALL Event Quote — ${decoratorName}\nCustomer: ${customerName || "Client"}\nPackage: ${hallOrPackage}\nEvent Date: ${eventDate || "TBD"}\nTotal: ₹${total.toLocaleString("en-IN")}\nAdvance (${advancePct}%): ₹${advanceAmt.toLocaleString("en-IN")}\nBalance: ₹${balanceAmt.toLocaleString("en-IN")}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-2xl border border-indigo-200 bg-white/95 p-3.5 shadow-sm text-slate-900 space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">🧾 Printable Quote &amp; Advance Invoice PDF</h4>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{advancePct}% Advance Rule</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
        <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
        <input value={hallOrPackage} onChange={(e) => setHallOrPackage(e.target.value)} placeholder="Hall / Decor Package" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
        <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="Total Amount (₹)" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs">
        <span>Advance ({advancePct}%): <strong>₹{advanceAmt.toLocaleString("en-IN")}</strong></span>
        <span>Balance: <strong>₹{balanceAmt.toLocaleString("en-IN")}</strong></span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={openPrintablePdf} className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer">🖨️ Generate Quote PDF</button>
        <button type="button" onClick={shareWhatsApp} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer">📲 Share on WhatsApp</button>
      </div>
    </div>
  );
}

/**
 * Labour Daily Attendance & Printable Muster Sheet
 */
export function LabourMusterSheetWidget() {
  const today = new Date().toISOString().slice(0, 10);
  const [siteName, setSiteName] = useState("Adilabad Worksite");
  const [workerName, setWorkerName] = useState("");
  const [dailyWage, setDailyWage] = useState("700");
  const [rows, setRows] = useState([
    { id: 1, name: "Ramesh (Mason)", wage: 850, status: "present" },
    { id: 2, name: "Suresh (Helper)", wage: 600, status: "present" },
  ]);

  const addWorker = () => {
    if (!workerName.trim()) return;
    setRows((r) => [...r, { id: Date.now(), name: workerName.trim(), wage: Math.max(0, Number(dailyWage) || 600), status: "present" }]);
    setWorkerName("");
  };

  const setStatus = (id, status) => setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  const payable = (x) => (x.status === "present" ? x.wage : x.status === "half" ? Math.round(x.wage / 2) : 0);
  const totalPayable = rows.reduce((sum, x) => sum + payable(x), 0);

  const printMuster = () => {
    const w = window.open("", "_blank", "width=760,height=900");
    if (!w) return;
    const trs = rows.map((x, i) => `<tr><td>${i + 1}</td><td>${x.name}</td><td>${x.status.toUpperCase()}</td><td>₹${x.wage}</td><td><strong>₹${payable(x)}</strong></td></tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>WE4ALL Labour Muster - ${today}</title>
    <style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:14px}
    th,td{border:1px solid #cbd5e1;padding:8px;font-size:13px;text-align:left}th{background:#f1f5f9}@media print{.noprint{display:none}}</style></head><body>
    <h2 style="color:#4f46e5;margin:0">WE4ALL Daily Labour Muster Sheet</h2>
    <div style="font-size:12px;color:#475569;margin-top:4px">Site: ${siteName} · Date: ${today}</div>
    <table><thead><tr><th>#</th><th>Worker</th><th>Attendance</th><th>Daily Rate</th><th>Payable</th></tr></thead><tbody>${trs}
    <tr style="background:#eef2ff"><td colspan="4"><strong>Total Daily Muster Payable</strong></td><td><strong>₹${totalPayable.toLocaleString("en-IN")}</strong></td></tr></tbody></table>
    <button class="noprint" onclick="window.print()" style="margin-top:14px;padding:9px 16px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">🖨️ Print / Save Muster PDF</button>
    </body></html>`);
    w.document.close();
  };

  return (
    <div className="rounded-2xl border border-indigo-200 bg-white/95 p-3.5 shadow-sm text-slate-900 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">📋 Daily Attendance &amp; Muster Sheet ({today})</h4>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">Total: ₹{totalPayable.toLocaleString("en-IN")}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Site Name" className="w-40 rounded-lg border border-slate-300 px-2 py-1 text-xs" />
        <input value={workerName} onChange={(e) => setWorkerName(e.target.value)} placeholder="Add Worker Name" className="flex-1 min-w-[130px] rounded-lg border border-slate-300 px-2 py-1 text-xs" />
        <input type="number" value={dailyWage} onChange={(e) => setDailyWage(e.target.value)} placeholder="₹/day" className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs" />
        <button type="button" onClick={addWorker} className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white cursor-pointer">+ Add</button>
      </div>
      <div className="space-y-1.5">
        {rows.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
            <span className="font-bold">{x.name} <span className="text-slate-500 font-normal">(₹{payable(x)})</span></span>
            <div className="flex gap-1">
              {["present", "half", "absent"].map((st) => (
                <button key={st} type="button" onClick={() => setStatus(x.id, st)} className={"rounded px-2 py-0.5 text-[10px] font-bold uppercase cursor-pointer " + (x.status === st ? (st === "present" ? "bg-emerald-600 text-white" : st === "half" ? "bg-amber-500 text-white" : "bg-rose-600 text-white") : "bg-white border border-slate-300 text-slate-600")}>
                  {st}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={printMuster} className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer">🖨️ Print / Save Muster Sheet PDF</button>
    </div>
  );
}