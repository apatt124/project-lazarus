export type Theme = {
  name: string;
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
  gradients: {
    primary: string;
    background: string;
    button: string;
  };
};

export const themes: Record<string, Theme> = {
  dark: {
    name: 'Dark',
    colors: {
      primary: '#8b5cf6',
      primaryDark: '#7c3aed',
      primaryLight: '#a78bfa',
      secondary: '#6366f1',
      accent: '#3b82f6',
      background: '#0a0a0a',
      surface: '#1a1a1a',
      text: '#f5f5f5',
      textSecondary: '#a3a3a3',
      border: '#2a2a2a',
    },
    gradients: {
      primary: 'from-violet-600 to-indigo-600',
      background: 'from-gray-950 via-gray-900 to-gray-950',
      button: 'from-violet-600 to-indigo-600',
    },
  },
  darkOcean: {
    name: 'Dark Ocean',
    colors: {
      primary: '#0ea5e9',
      primaryDark: '#0284c7',
      primaryLight: '#38bdf8',
      secondary: '#06b6d4',
      accent: '#14b8a6',
      background: '#0a0a0a',
      surface: '#1a1a1a',
      text: '#f0f9ff',
      textSecondary: '#94a3b8',
      border: '#1e293b',
    },
    gradients: {
      primary: 'from-sky-600 to-cyan-600',
      background: 'from-gray-950 via-slate-900 to-gray-950',
      button: 'from-sky-500 to-cyan-500',
    },
  },
  gemini: {
    name: 'Gemini',
    colors: {
      primary: '#8b5cf6',
      primaryDark: '#7c3aed',
      primaryLight: '#a78bfa',
      secondary: '#6366f1',
      accent: '#3b82f6',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#0f172a',
      textSecondary: '#64748b',
      border: '#e2e8f0',
    },
    gradients: {
      primary: 'from-violet-600 to-indigo-600',
      background: 'from-violet-50 via-purple-50 to-blue-50',
      button: 'from-violet-600 to-indigo-600',
    },
  },
  ocean: {
    name: 'Ocean',
    colors: {
      primary: '#0ea5e9',
      primaryDark: '#0284c7',
      primaryLight: '#38bdf8',
      secondary: '#06b6d4',
      accent: '#14b8a6',
      background: '#f0f9ff',
      surface: '#ffffff',
      text: '#0c4a6e',
      textSecondary: '#475569',
      border: '#e0f2fe',
    },
    gradients: {
      primary: 'from-sky-600 to-cyan-600',
      background: 'from-sky-50 via-cyan-50 to-blue-50',
      button: 'from-sky-500 to-cyan-500',
    },
  },
  forest: {
    name: 'Forest',
    colors: {
      primary: '#10b981',
      primaryDark: '#059669',
      primaryLight: '#34d399',
      secondary: '#14b8a6',
      accent: '#06b6d4',
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#064e3b',
      textSecondary: '#475569',
      border: '#d1fae5',
    },
    gradients: {
      primary: 'from-emerald-600 to-teal-600',
      background: 'from-emerald-50 via-teal-50 to-cyan-50',
      button: 'from-emerald-500 to-teal-500',
    },
  },
  sunset: {
    name: 'Sunset',
    colors: {
      primary: '#f59e0b',
      primaryDark: '#d97706',
      primaryLight: '#fbbf24',
      secondary: '#f97316',
      accent: '#ef4444',
      background: '#fffbeb',
      surface: '#ffffff',
      text: '#78350f',
      textSecondary: '#57534e',
      border: '#fef3c7',
    },
    gradients: {
      primary: 'from-amber-600 to-orange-600',
      background: 'from-amber-50 via-orange-50 to-red-50',
      button: 'from-amber-500 to-orange-500',
    },
  },
  rose: {
    name: 'Rose',
    colors: {
      primary: '#ec4899',
      primaryDark: '#db2777',
      primaryLight: '#f472b6',
      secondary: '#f43f5e',
      accent: '#a855f7',
      background: '#fdf2f8',
      surface: '#ffffff',
      text: '#831843',
      textSecondary: '#64748b',
      border: '#fce7f3',
    },
    gradients: {
      primary: 'from-pink-600 to-rose-600',
      background: 'from-pink-50 via-rose-50 to-purple-50',
      button: 'from-pink-500 to-rose-500',
    },
  },
  midnight: {
    name: 'Midnight',
    colors: {
      primary: '#6366f1',
      primaryDark: '#4f46e5',
      primaryLight: '#818cf8',
      secondary: '#8b5cf6',
      accent: '#a78bfa',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1e1b4b',
      textSecondary: '#475569',
      border: '#e0e7ff',
    },
    gradients: {
      primary: 'from-indigo-600 to-purple-600',
      background: 'from-indigo-50 via-purple-50 to-violet-50',
      button: 'from-indigo-500 to-purple-500',
    },
  },
};

export const defaultTheme = 'dark';
