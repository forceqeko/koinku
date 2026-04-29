import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, BarChart2, Settings, Plus } from 'lucide-react';
import clsx from 'clsx';

export const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Transaksi', path: '/transactions', icon: ArrowRightLeft },
  { name: 'Laporan', path: '/report', icon: BarChart2 },
  { name: 'Pengaturan', path: '/settings', icon: Settings },
];

interface SidebarProps {
  onQuickAdd?: () => void;
}

export default function Sidebar({ onQuickAdd }: SidebarProps) {
  return (
    <aside
      className="w-[240px] hidden md:flex flex-col fixed left-0 top-0 h-screen z-40"
      style={{
        backgroundColor: 'var(--color-sidebar-bg)',
        borderRight: '1px solid var(--color-sidebar-border)',
      }}
    >
      {/* Logo */}
      <div
        className="h-[60px] flex items-center px-5"
        style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Koin Ku"
            className="w-9 h-9 object-contain rounded-[2px] shrink-0"
          />
          <span
            className="text-[20px] font-bold tracking-tight"
            style={{ color: 'var(--color-sidebar-fg)' }}
          >
            Koin Ku
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5" aria-label="Menu utama">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              aria-label={item.name}
              className={() =>
                clsx(
                  "flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-colors"
                )
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--color-sidebar-active)' : 'transparent',
                color: isActive ? 'var(--color-sidebar-active-fg)' : 'var(--color-sidebar-muted)',
              })}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Quick Add Button */}
      {onQuickAdd && (
        <div className="px-3 pb-4">
          <button
            onClick={onQuickAdd}
            aria-label="Tambah transaksi baru"
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97]"
            style={{
              backgroundColor: 'var(--color-sidebar-active)',
              color: 'var(--color-sidebar-active-fg)',
            }}
          >
            <Plus className="w-4 h-4" />
            Tambah Transaksi
          </button>
        </div>
      )}
    </aside>
  );
}
