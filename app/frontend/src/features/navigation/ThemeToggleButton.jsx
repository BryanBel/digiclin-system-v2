import { useEffect, useState } from "react";

const THEME_KEY = "theme";

export default function ThemeToggleButton() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = localStorage.getItem(THEME_KEY);
    const initialDark = stored
      ? stored === "dark"
      : prefersDark.matches;

    document.documentElement.classList.toggle("dark", initialDark);
    setIsDark(initialDark);

    const handlePrefChange = (event) => {
      if (!localStorage.getItem(THEME_KEY)) {
        document.documentElement.classList.toggle("dark", event.matches);
        setIsDark(event.matches);
      }
    };

    prefersDark.addEventListener("change", handlePrefChange);
    return () => prefersDark.removeEventListener("change", handlePrefChange);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem(THEME_KEY, nextDark ? "dark" : "light");
    setIsDark(nextDark);
  };

  return (
    <button
      id="theme-toggle"
      className="theme-toggle"
      type="button"
      aria-label="Cambiar tema"
      aria-pressed={isDark}
      onClick={toggleTheme}
    >
      <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
        ☀️
      </span>
      <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
        🌙
      </span>
    </button>
  );
}