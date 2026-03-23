import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useI18n, Lang, langMeta } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const langs: Lang[] = ['qq', 'ru', 'en', 'uz'];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg border bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium transition-colors"
        title="Change language"
      >
        <Globe size={13} />
        <span>{langMeta[lang].short}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in-up">
          {langs.map(l => (
            <button
              key={l}
              onClick={() => { setLang(l); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                l === lang
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <span>{langMeta[l].label}</span>
              <span className="text-xs text-muted-foreground font-mono">{langMeta[l].short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
