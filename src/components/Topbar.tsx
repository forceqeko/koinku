import { Sun, Moon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/transactions': return 'Riwayat Transaksi';
      case '/report': return 'Laporan Finansial';
      case '/settings': return 'Pengaturan';
      default: return 'Koin Ku';
    }
  };

  if (location.pathname === '/') return null;

  return (
    <header className="h-[60px] flex items-center justify-between px-4 sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-line shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      {/* Left Placeholder */}
      <div className="w-10"></div>
      
      {/* Centered Title */}
      <h1 className="absolute inset-0 flex items-center justify-center text-[16px] sm:text-[17px] font-bold text-text-primary pointer-events-none -mr-1">
        {getPageTitle()}
      </h1>

      {/* Right Actions */}
      <div className="flex items-center z-10 w-10 justify-end">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors active:scale-95"
          aria-label="Toggle tema"
        >
          {theme === 'dark' ? <Sun className="w-[20px] h-[20px]" /> : <Moon className="w-[20px] h-[20px]" />}
        </button>
      </div>
    </header>
  );
}
