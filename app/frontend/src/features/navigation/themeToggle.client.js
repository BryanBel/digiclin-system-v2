export function bootThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  const applyTheme = (mode) => {
    const isDark = mode === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("data-theme", mode);
  };

  const readStoredTheme = () => {
    try {
      return localStorage.getItem("theme");
    } catch {
      return null;
    }
  };

  const persistTheme = (mode) => {
    try {
      localStorage.setItem("theme", mode);
    } catch {
      /* noop */
    }
  };

  const resolveInitialTheme = () => {
    const stored = readStoredTheme();
    if (stored === "light" || stored === "dark") return stored;
    return prefersDark.matches ? "dark" : "light";
  };

  let currentTheme = resolveInitialTheme();
  applyTheme(currentTheme);

  toggle.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(currentTheme);
    persistTheme(currentTheme);
  });

  prefersDark.addEventListener("change", (event) => {
    const stored = readStoredTheme();
    if (!stored) {
      currentTheme = event.matches ? "dark" : "light";
      applyTheme(currentTheme);
    }
  });
}
