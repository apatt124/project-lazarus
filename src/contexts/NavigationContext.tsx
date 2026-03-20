import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ViewType = 'chat' | 'graph' | 'documents' | 'facts';

interface NavigationContextType {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  const setView = (view: ViewType) => {
    setCurrentView(view);
    // Close sidebar on mobile when navigating
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <NavigationContext.Provider
      value={{
        currentView,
        setView,
        isMobile,
        isTablet,
        isDesktop,
        sidebarOpen,
        toggleSidebar,
        setSidebarOpen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
