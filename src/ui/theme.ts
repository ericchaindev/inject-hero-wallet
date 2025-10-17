export type Theme = 'light' | 'dark';

const THEME_KEY = 'ui_theme';

export async function getTheme(): Promise<Theme> {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local.get({ [THEME_KEY]: 'dark' }, (res) => {
        const t = (res?.[THEME_KEY] as Theme) || 'dark';
        resolve(t);
      });
    } catch {
      resolve('dark');
    }
  });
}

export function applyTheme(theme: Theme) {
  const el = document.documentElement;
  el.setAttribute('data-theme', theme);
}

export async function setTheme(theme: Theme): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local.set({ [THEME_KEY]: theme }, () => {
        applyTheme(theme);
        resolve();
      });
    } catch {
      applyTheme(theme);
      resolve();
    }
  });
}

export async function initTheme() {
  const theme = await getTheme();
  applyTheme(theme);
}
