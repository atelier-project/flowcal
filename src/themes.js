/**
 * Theme Definitions
 * Each theme defines CSS custom property overrides
 */

export const THEMES = {
    light: {
        name: 'Light',
        isDark: false,
        colors: {
            '--bg-primary': '#f8fafc',
            '--bg-secondary': '#ffffff',
            '--bg-tertiary': '#f1f5f9',
            '--border-primary': '#e2e8f0',
            '--border-secondary': '#cbd5e1',
            '--text-primary': '#1e293b',
            '--text-secondary': '#64748b',
            '--text-muted': '#94a3b8',
            '--accent-primary': '#3b82f6',
            '--accent-secondary': '#8b5cf6',
            '--connection-stroke': '#3b82f6',
            '--connection-glow': 'rgba(59, 130, 246, 0.5)',
        }
    },
    dark: {
        name: 'Dark',
        isDark: true,
        colors: {
            '--bg-primary': '#0f172a',
            '--bg-secondary': '#1e293b',
            '--bg-tertiary': '#334155',
            '--border-primary': '#334155',
            '--border-secondary': '#475569',
            '--text-primary': '#f1f5f9',
            '--text-secondary': '#94a3b8',
            '--text-muted': '#64748b',
            '--accent-primary': '#3b82f6',
            '--accent-secondary': '#8b5cf6',
            '--connection-stroke': '#3b82f6',
            '--connection-glow': 'rgba(59, 130, 246, 0.5)',
        }
    },
    cyberpunk: {
        name: 'Cyberpunk',
        isDark: true,
        colors: {
            '--bg-primary': '#0d0221',
            '--bg-secondary': '#1a0a3e',
            '--bg-tertiary': '#2d1b69',
            '--border-primary': '#ff00ff',
            '--border-secondary': '#00ffff',
            '--text-primary': '#ff00ff',
            '--text-secondary': '#00ffff',
            '--text-muted': '#9d4edd',
            '--accent-primary': '#ff00ff',
            '--accent-secondary': '#00ffff',
            '--connection-stroke': '#00ffff',
            '--connection-glow': 'rgba(0, 255, 255, 0.6)',
        }
    },
    dracula: {
        name: 'Dracula',
        isDark: true,
        colors: {
            '--bg-primary': '#282a36',
            '--bg-secondary': '#44475a',
            '--bg-tertiary': '#6272a4',
            '--border-primary': '#6272a4',
            '--border-secondary': '#bd93f9',
            '--text-primary': '#f8f8f2',
            '--text-secondary': '#bd93f9',
            '--text-muted': '#6272a4',
            '--accent-primary': '#ff79c6',
            '--accent-secondary': '#50fa7b',
            '--connection-stroke': '#bd93f9',
            '--connection-glow': 'rgba(189, 147, 249, 0.5)',
        }
    },
    ocean: {
        name: 'Ocean',
        isDark: true,
        colors: {
            '--bg-primary': '#0c1929',
            '--bg-secondary': '#112240',
            '--bg-tertiary': '#1d3557',
            '--border-primary': '#457b9d',
            '--border-secondary': '#64dfdf',
            '--text-primary': '#e0fbfc',
            '--text-secondary': '#64dfdf',
            '--text-muted': '#457b9d',
            '--accent-primary': '#48cae4',
            '--accent-secondary': '#00b4d8',
            '--connection-stroke': '#48cae4',
            '--connection-glow': 'rgba(72, 202, 228, 0.5)',
        }
    },
    forest: {
        name: 'Forest',
        isDark: true,
        colors: {
            '--bg-primary': '#1a2f1a',
            '--bg-secondary': '#2d4a2d',
            '--bg-tertiary': '#3d5a3d',
            '--border-primary': '#52796f',
            '--border-secondary': '#84a98c',
            '--text-primary': '#cad2c5',
            '--text-secondary': '#84a98c',
            '--text-muted': '#52796f',
            '--accent-primary': '#52b788',
            '--accent-secondary': '#95d5b2',
            '--connection-stroke': '#52b788',
            '--connection-glow': 'rgba(82, 183, 136, 0.5)',
        }
    },
    sunset: {
        name: 'Sunset',
        isDark: true,
        colors: {
            '--bg-primary': '#1f1135',
            '--bg-secondary': '#2d1b4e',
            '--bg-tertiary': '#432874',
            '--border-primary': '#ff6b6b',
            '--border-secondary': '#feca57',
            '--text-primary': '#ffeaa7',
            '--text-secondary': '#ff9ff3',
            '--text-muted': '#a29bfe',
            '--accent-primary': '#ff9f43',
            '--accent-secondary': '#ee5a24',
            '--connection-stroke': '#ff6b6b',
            '--connection-glow': 'rgba(255, 107, 107, 0.5)',
        }
    },
    christmas: {
        name: '🎄 Christmas',
        isDark: true,
        hasSnow: true,
        colors: {
            '--bg-primary': '#1a0a0a',
            '--bg-secondary': '#2d1515',
            '--bg-tertiary': '#3d2020',
            '--border-primary': '#2e7d32',
            '--border-secondary': '#c62828',
            '--text-primary': '#fffde7',
            '--text-secondary': '#81c784',
            '--text-muted': '#a5d6a7',
            '--accent-primary': '#c62828',
            '--accent-secondary': '#ffd54f',
            '--connection-stroke': '#2e7d32',
            '--connection-glow': 'rgba(46, 125, 50, 0.6)',
        }
    },
    pink: {
        name: '💕 Pink',
        isDark: false,
        colors: {
            '--bg-primary': '#fff0f5',
            '--bg-secondary': '#ffffff',
            '--bg-tertiary': '#fce4ec',
            '--border-primary': '#f8bbd9',
            '--border-secondary': '#f48fb1',
            '--text-primary': '#880e4f',
            '--text-secondary': '#ad1457',
            '--text-muted': '#c2185b',
            '--accent-primary': '#e91e63',
            '--accent-secondary': '#9c27b0',
            '--connection-stroke': '#e91e63',
            '--connection-glow': 'rgba(233, 30, 99, 0.5)',
        }
    }
};

export const applyTheme = (themeId) => {
    const theme = THEMES[themeId];
    if (!theme) return;

    const root = document.documentElement;

    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([prop, value]) => {
        root.style.setProperty(prop, value);
    });

    // Set dark class for Tailwind
    if (theme.isDark) {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }

    // Store preference
    localStorage.setItem('flowcal-theme-id', themeId);
};

export const getStoredTheme = () => {
    return localStorage.getItem('flowcal-theme-id') || 'light';
};
