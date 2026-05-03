import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Palette } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../context/ThemeContext';

interface ThemeDropdownProps {
  className?: string;
  buttonClassName?: string;
  menuAlign?: 'left' | 'right';
  iconOnly?: boolean;
}

export default function ThemeDropdown({
  className,
  buttonClassName,
  menuAlign = 'right',
  iconOnly = false,
}: ThemeDropdownProps) {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeTheme = useMemo(
    () => themes.find((item) => item.id === theme) || themes[0],
    [theme, themes]
  );

  return (
    <div ref={wrapperRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={clsx(
          iconOnly
            ? 'bg-surface border border-line rounded-2xl flex items-center justify-center shadow-sm hover:border-accent/40 transition-all text-text-primary group h-[46px] w-[46px]'
            : 'bg-surface border border-line px-4 py-2.5 rounded-2xl flex items-center gap-2 md:gap-3 shadow-sm hover:border-accent/40 transition-all font-bold text-[12px] md:text-[13px] text-text-primary justify-between group h-[46px] min-w-[182px]',
          buttonClassName
        )}
        aria-label="Pilih tema aplikasi"
        title={activeTheme.label}
      >
        <div className={clsx('flex items-center min-w-0', iconOnly ? 'justify-center' : 'gap-2.5')}>
          <div className="theme-dropdown-icon w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <Palette className="w-4 h-4" />
          </div>
          {!iconOnly && <span className="truncate">{activeTheme.label}</span>}
        </div>
        {!iconOnly && (
          <ChevronDown className={clsx('w-4 h-4 text-text-muted transition-transform duration-300 shrink-0', isOpen && 'rotate-180')} />
        )}
      </button>

      {isOpen && (
        <div
          className={clsx(
            'absolute top-full mt-2 z-40 w-[260px] bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-scale-in p-1',
            menuAlign === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="space-y-1">
            {themes.map((item) => {
              const isSelected = item.id === theme;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTheme(item.id);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'w-full px-4 py-3 rounded-xl text-left transition-all flex items-start justify-between gap-3 group',
                    isSelected
                      ? 'bg-accent font-bold'
                      : 'text-text-primary hover:bg-surface-hover hover:text-accent'
                  )}
                  style={isSelected ? { color: 'var(--primary-foreground)' } : undefined}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{item.label}</p>
                    <p
                      className={clsx('text-[11px] mt-0.5', !isSelected && 'text-text-muted group-hover:text-accent/80')}
                      style={isSelected ? { color: 'color-mix(in oklab, var(--primary-foreground) 78%, transparent)' } : undefined}
                    >
                      {item.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'color-mix(in oklab, var(--primary-foreground) 15%, transparent)' }}>
                      <Check className="w-3.5 h-3.5" style={{ color: 'var(--primary-foreground)' }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
