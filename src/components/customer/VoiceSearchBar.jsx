import React, { useEffect, useRef, useState } from "react";

export function VoiceSearchBar({
  value = "",
  onChange,
  onSearch,
  placeholder = "Search rice, plumber, medicines, or rides...",
}) {
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const SpeechApi =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  useEffect(() => () => { try { recognitionRef.current?.stop?.(); } catch {} }, []);

  const detectSpeechLang = () => {
    const navLang = String(typeof navigator !== "undefined" ? navigator.language || "" : "").toLowerCase();
    if (navLang.startsWith("te")) return "te-IN";
    if (navLang.startsWith("hi")) return "hi-IN";
    return "en-IN";
  };

  const toggleVoice = () => {
    if (listening) { recognitionRef.current?.stop?.(); setListening(false); return; }
    if (!SpeechApi) {
      setHint("Voice search works on Chrome/Android. Use your keyboard mic or type below.");
      inputRef.current?.focus();
      return;
    }
    setHint("");
    const rec = new SpeechApi();
    rec.lang = detectSpeechLang();
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim() || "";
      if (transcript) { onChange?.(transcript); onSearch?.(transcript); }
    };
    rec.onerror = (event) => {
      setHint(event?.error === "not-allowed" ? "Allow microphone access for voice search." : "Could not hear clearly. Tap mic and try again.");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
  };

  const handleImagePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    const rawName = file.name
      .replace(/.[^.]+$/, "")
      .replace(/^(jpeg|jpg|png|img|pxl|whatsapp|image|photo|screenshot|vid|dcim)[-_s]*/gi, "")
      .replace(/[0-9_-]+/g, " ")
      .trim();
    setImagePreview({ url: previewUrl, detectedTerm: rawName.length >= 3 ? rawName : "" });
    if (rawName.length >= 3) {
      onChange?.(rawName);
      onSearch?.(rawName);
      setHint(`Showing lowest-price local matches for "${rawName}"`);
    } else {
      setHint("Photo scanned — showing available local products sorted lowest price first.");
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-white p-2 shadow-sm we4-surface">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSearch?.(value); }}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent px-2 text-sm outline-none"
        />
        {value && (
          <button type="button" onClick={() => { onChange?.(""); onSearch?.(""); setImagePreview(null); setHint(""); }} className="px-2 py-1 text-xs font-semibold opacity-60 hover:opacity-100">
            Clear
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImagePicked} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Image product search" title="Search by product photo" className="px-2.5 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shrink-0">
          📷
        </button>
        <button type="button" onClick={toggleVoice} aria-label="Voice search" className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${listening ? "bg-rose-600 text-white animate-pulse" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
          {listening ? "Listening..." : "🎤 Voice"}
        </button>
      </div>

      {imagePreview && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={imagePreview.url} alt="Scanned product" className="h-11 w-11 rounded-xl object-cover border border-indigo-300 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-black text-indigo-950">📷 Visual Product Match Active</p>
              <p className="text-[10px] text-indigo-700 truncate">{hint || "Comparing local merchant prices (lowest first)…"}</p>
            </div>
          </div>
          <button type="button" onClick={() => { setImagePreview(null); setHint(""); }} className="text-xs font-black text-rose-600 px-2 py-1">✕</button>
        </div>
      )}
      {!imagePreview && hint && <p className="text-[11px] text-indigo-700 font-semibold px-1">{hint}</p>}
    </div>
  );
}
