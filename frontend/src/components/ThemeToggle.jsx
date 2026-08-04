import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { flushSync } from 'react-dom';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = (event) => {
    // Fallback if View Transitions API is not supported
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      toggleTheme();
      return;
    }

    const x = event.clientX;
    const y = event.clientY;

    document.documentElement.style.setProperty('--x', `${x}px`);
    document.documentElement.style.setProperty('--y', `${y}px`);

    document.startViewTransition(() => {
      flushSync(() => {
        toggleTheme();
      });
    });
  };

  return (
    <button
      onClick={handleToggle}
      className="relative p-2.5 rounded-xl border border-crm-border hover:border-crm-primary/50 transition-all duration-300 bg-crm-card/50 hover:bg-crm-card/80 flex items-center justify-center overflow-hidden hover:scale-105 active:scale-95 group shadow-sm hover:shadow-glow"
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Sun
          size={18}
          className={`absolute text-amber-400 transition-all duration-500 transform ${
            theme === 'light'
              ? 'scale-100 rotate-0 opacity-100'
              : 'scale-0 -rotate-90 opacity-0'
          } group-hover:rotate-12`}
        />
        <Moon
          size={18}
          className={`absolute text-crm-primary transition-all duration-500 transform ${
            theme === 'dark'
              ? 'scale-100 rotate-0 opacity-100'
              : 'scale-0 rotate-90 opacity-0'
          } group-hover:-rotate-12`}
        />
      </div>
    </button>
  );
};
