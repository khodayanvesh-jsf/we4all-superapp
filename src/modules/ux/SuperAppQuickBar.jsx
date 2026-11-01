import React, { useState } from "react";

export function VoiceAndQuickChipsBar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  lang = "EN",
  onTriggerToast
}) {
  const [listening, setListening] = useState(false);

  const quickChips = [
    { label: "All Essentials", query: "", cat: "daily_needs" },
    { label: "Atta & Rice", query: "Atta", cat: "daily_needs" },
    { label: "Fresh Veg", query: "", cat: "veg_fruits" },
    { label: "Mutton & Chicken", query: "", cat: "meat_fish" },
    { label: "Cement & Steel", query: "", cat: "construction" },
    { label: "Medicines", query: "", cat: "medicines" }
  ];

  const handleVoiceSearch = () => {
    const SpeechRec =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      if (onTriggerToast)
        onTriggerToast("Voice recognition is supported in Chrome / Android WebView.");
      return;
    }
    try {
      const recognition = new SpeechRec();
      const langMap = {
        EN: "en-IN",
        TE: "te-IN",
        HI: "hi-IN",
        MR: "mr-IN",
        KN: "kn-IN"
      };
      recognition.lang = langMap[lang] || "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setListening(true);
      recognition.onresult = (event) => {
        const spoken = event.results?.[0]?.[0]?.transcript || "";
        if (spoken) {
          setSearchQuery(spoken);
          if (onTriggerToast) onTriggerToast(`Voice Search: "${spoken}"`);
        }
        setListening(false);
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);
      recognition.start();
    } catch (e) {
      setListening(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={handleVoiceSearch}
          className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 flex items-center gap-1 cursor-pointer shadow ${
            listening
              ? "bg-rose-600 text-white animate-pulse"
              : "bg-amber-400 text-slate-950"
          }`}
        >
          <span>{listening ? "Listening..." : " Voice Search"}</span>
        </button>
        {quickChips.map((chip, idx) => {
          const active =
            selectedCategory === chip.cat && searchQuery === chip.query;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedCategory(chip.cat);
                setSearchQuery(chip.query);
              }}
              className={`px-2.5 py-1 rounded-full text-[9px] font-black shrink-0 border cursor-pointer transition ${
                active
                  ? "bg-emerald-600 text-white border-emerald-500 shadow"
                  : "bg-white text-slate-800 border-slate-300"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StickyBottomCartPill({ merchantCart = [], onOpenCart }) {
  if (!merchantCart || merchantCart.length === 0) return null;
  const totalQty = merchantCart.reduce((s, i) => s + (i.qty || 1), 0);
  const totalPrice = merchantCart.reduce(
    (s, i) => s + Number(i.price || 0) * (i.qty || 1),
    0
  );

  return (
    <div className="sticky bottom-2 z-30 pt-1">
      <button
        type="button"
        onClick={onOpenCart}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl border-2 border-amber-400 flex justify-between items-center cursor-pointer"
      >
        <div className="text-left">
          <span className="text-[11px] font-black block">
             {totalQty} {totalQty === 1 ? "Item" : "Items"} in Cart &bull; Rs.{totalPrice}
          </span>
          <span className="text-[9px] text-amber-200 font-bold block">
            Compare shops &amp; choose 2W / 3W / 4W delivery vehicle
          </span>
        </div>
        <span className="bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-xl text-[10px]">
          View Cart &rarr;
        </span>
      </button>
    </div>
  );
}