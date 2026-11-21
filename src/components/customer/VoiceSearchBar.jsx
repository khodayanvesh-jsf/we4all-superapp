import React, { useEffect, useRef, useState } from 'react';

const VOICE_LANGS = [
  { code: 'te-IN', label: 'Telugu' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'en-IN', label: 'English' },
];

export function VoiceSearchBar({
  value = '',
  onChange,
  onSearch,
  placeholder = 'Search rice, plumber, medicines, or rides...',
}) {
  const [lang, setLang] = useState('te-IN');
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState('');
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  const SpeechApi =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // ignore stop cleanup error
      }
    };
  }, []);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }

    if (!SpeechApi) {
      setHint('Voice works in Chrome/PWA. Type below or use your Android keyboard mic.');
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
      if (transcript) {
        onChange?.(transcript);
        onSearch?.(transcript);
      }
    };
    rec.onerror = (event) => {
      setHint(
        event?.error === 'not-allowed'
          ? 'Allow microphone access to use voice search.'
          : 'Could not hear clearly. Tap mic and try again.'
      );
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-2xl border p-2 shadow-sm we4-surface">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch?.(value);
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-2 text-sm outline-none"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange?.('');
              onSearch?.('');
            }}
            className="px-2 py-1 text-xs font-semibold opacity-60 hover:opacity-100"
          >
            Clear
          </button>
        )}

        <button
          type="button"
          onClick={toggleVoice}
          aria-label="Voice search"
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            listening
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {listening ? 'Listening...' : 'Voice'}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {VOICE_LANGS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLang(item.code)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                lang === item.code
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-transparent opacity-75 border-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {hint && <p className="text-[11px] text-amber-600 font-medium">{hint}</p>}
      </div>
    </div>
  );
}