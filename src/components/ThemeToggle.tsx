import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );

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
