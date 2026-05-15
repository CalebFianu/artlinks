import { createContext, useContext, useEffect, useState } from 'react';

const TweaksContext = createContext(null);

export function TweaksProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('artlinks:theme') || 'light'
  );

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('artlinks:theme', theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <TweaksContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </TweaksContext.Provider>
  );
}

export function useTweaks() {
  return useContext(TweaksContext);
}
