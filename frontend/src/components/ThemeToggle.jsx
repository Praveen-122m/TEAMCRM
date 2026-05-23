import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-full border border-crm-border hover:border-crm-primary/50 transition-colors bg-crm-darker/30 flex items-center justify-center overflow-hidden"
      aria-label="Toggle theme"
    >
      <div
        className={`transition-transform duration-500 flex flex-col items-center justify-center absolute ${
          theme === 'light' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <Sun size={18} className="text-amber-500" />
      </div>
      <div
        className={`transition-transform duration-500 flex flex-col items-center justify-center ${
          theme === 'dark' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <Moon size={18} className="text-crm-textMuted hover:text-white" />
      </div>
    </button>
  );
};
