import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'green-yellow' | 'black-green' | 'celestial-blue';

export const themeOptions = [
  {
    id: 'green-yellow' as const,
    label: 'Green and Yellow',
    description: 'Tema terang bawaan dengan aksen hijau hangat.',
    isDark: false,
  },
  {
    id: 'black-green' as const,
    label: 'Black Green',
    description: 'Tema gelap dengan kontras hijau yang tegas.',
    isDark: true,
  },
  {
    id: 'celestial-blue' as const,
    label: 'Celestial Blue',
    description: 'Tema terang bernuansa biru yang lebih tenang.',
    isDark: false,
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: typeof themeOptions;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('fintrack_theme');
    if (saved === 'green-yellow' || saved === 'black-green' || saved === 'celestial-blue') return saved;
    if (saved === 'dark') return 'black-green';
    if (saved === 'light') return 'green-yellow';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'black-green' : 'green-yellow';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const activeTheme = themeOptions.find((item) => item.id === theme);
    root.dataset.theme = theme;
    root.classList.toggle('dark', !!activeTheme?.isDark);
    localStorage.setItem('fintrack_theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: themeOptions }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
