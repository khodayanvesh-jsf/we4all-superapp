import React, { useEffect, useRef, useState } from 'react';

const VOICE_LANGS = [
  { code: 'te-IN', label: 'Telugu' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'en-IN', label: 'English' },
];
const VISUAL_MATCH_CHIPS = ['Rice', 'Vegetables', 'Milk', 'Medicines', 'Bakery', 'Cement'];

export function VoiceSearchBar({
  value = '',
  onChange,
  onSearch,
  placeholder = 'Search rice, plumber, medicines, or rides...',
}) {
  const [lang, setLang] = useState('te-IN');
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const SpeechApi =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop?.(); } catch { /* ignore */ }
    };
  }, []);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    if (!SpeechApi) {
      setHint('Voice works in Chrome/Android. Type below or use your keyboard mic.');
      inputRef.current?.focus();
      return;
    }
    setHint('');
    const rec = new SpeechApi();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim() || '';
      if (transcript) { onChange?.(transcript); onSearch?.(transcript); }
    };
    rec.onerror = (event) => {
      setHint(event?.error === 'not-allowed' ? 'Allow microphone access for voice search.' : 'Could not hear clearly. Tap mic and try again.');
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
    const cleaned = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/^(img|pxl|whatsapp|image|photo|screenshot)[-_0-9\s]*/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    setImagePreview({ url: previewUrl, name: file.name });
    if (cleaned.length >= 3) {
      onChange?.(cleaned);
      onSearch?.(cleaned);
      setHint(`Matched visual query "${cleaned}" — tap a quick tag below to refine.`);
    } else {
      setHint('Photo captured! Tap a quick visual tag below or type the product name to match.');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-white p-2 shadow-sm we4-surface">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch?.(value); }}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent px-2 text-sm outline-none"
        />
        {value && (
          <button type="button" onClick={() => { onChange?.(''); onSearch?.(''); setImagePreview(null); setHint(''); }} className="px-2 py-1 text-xs font-semibold opacity-60 hover:opacity-100">
            Clear
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImagePicked} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Image product search"
          title="Search by product photo"
          className="px-2.5 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shrink-0"
        >
          📷
        </button>
        <button
          type="button"
          onClick={toggleVoice}
          aria-label="Voice search"
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            listening ? 'bg-rose-600 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {listening ? 'Listening...' : '🎤 Voice'}
        </button>
      </div>

      {imagePreview && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img src={imagePreview.url} alt="Visual search preview" className="h-10 w-10 rounded-xl object-cover border border-indigo-300 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-indigo-900 truncate">📷 Visual Product Search Active</p>
                <p className="text-[10px] text-indigo-700 truncate">{imagePreview.name}</p>
              </div>
            </div>
            <button type="button" onClick={() => { setImagePreview(null); setHint(''); }} className="text-[11px] font-bold text-rose-600 px-2 py-1">✕</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VISUAL_MATCH_CHIPS.map((chip) => (
              <button key={chip} type="button" onClick={() => { onChange?.(chip); onSearch?.(chip); }} className="rounded-full bg-white border border-indigo-200 px-2.5 py-1 text-[10px] font-bold text-indigo-800 hover:bg-indigo-600 hover:text-white">
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {VOICE_LANGS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLang(item.code)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                lang === item.code ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent opacity-75 border-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {hint && <p className="text-[11px] text-indigo-700 font-semibold">{hint}</p>}
      </div>
    </div>
  );
}