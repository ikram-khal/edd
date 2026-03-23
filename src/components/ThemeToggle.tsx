import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

function getInitialDark(): boolean {
  const saved = localStorage.getItem('edawis_theme');
  if (saved) return saved === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('edawis_theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <Button
      variant="secondary"
      size="sm"
      className="text-xs px-2 h-7"
      onClick={() => setDark(d => !d)}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
    </Button>
  );
}
