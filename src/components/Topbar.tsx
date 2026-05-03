import { useLocation } from 'react-router-dom';
import ThemeDropdown from './ThemeDropdown';

export default function Topbar() {
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
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-line shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="h-[60px] max-w-[1100px] mx-auto px-4 md:px-6 flex items-center justify-between">
        <h1 className="text-[16px] sm:text-[17px] font-bold text-text-primary">
          {getPageTitle()}
        </h1>

        <ThemeDropdown className="shrink-0" iconOnly />
      </div>
    </header>
  );
}
