// CSS used for Expo Web to approximate Tailwind/NativeWind utilities without
// relying on Metro/PostCSS at runtime. Injected into <head> on web only.

export const WEB_CSS = `
/* Web-specific styles for SkillSwap Mobile */

/* Reset and base styles */
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

/* Theme colors matching tailwind config */
:root {
  --background: #f5f1e8;
  --foreground: #333333;
  --card: #f9f7f0;
  --primary: #4f7942;
  --primary-foreground: #ffffff;
  --muted: #dcd6ca;
  --muted-foreground: #666666;
  --border: #c4b5a0;
}

/* Utility classes */
.flex-1 { flex: 1 !important; }
.flex { display: flex !important; }
.flex-row { flex-direction: row !important; }
.flex-col { flex-direction: column !important; }
.items-center { align-items: center !important; }
.justify-center { justify-content: center !important; }
.gap-2 { gap: 8px !important; }
.gap-3 { gap: 12px !important; }

/* Background colors */
.bg-background { background-color: var(--background) !important; }
.bg-card { background-color: var(--card) !important; }
.bg-primary { background-color: var(--primary) !important; }

/* Text colors */
.text-foreground { color: var(--foreground) !important; }
.text-primary { color: var(--primary) !important; }
.text-muted-foreground { color: var(--muted-foreground) !important; }
.text-primary-foreground { color: var(--primary-foreground) !important; }

/* Borders */
.border { border-width: 1px !important; border-style: solid !important; }
.border-border { border-color: var(--border) !important; }
.border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; }
.rounded-lg { border-radius: 8px !important; }
.rounded-full { border-radius: 9999px !important; }

/* Spacing */
.p-3 { padding: 12px !important; }
.p-4 { padding: 16px !important; }
.px-3 { padding-left: 12px !important; padding-right: 12px !important; }
.px-4 { padding-left: 16px !important; padding-right: 16px !important; }
.px-6 { padding-left: 24px !important; padding-right: 24px !important; }
.py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
.py-3 { padding-top: 12px !important; padding-bottom: 12px !important; }
.pt-10 { padding-top: 40px !important; }
.mb-2 { margin-bottom: 8px !important; }
.mb-3 { margin-bottom: 12px !important; }
.mb-4 { margin-bottom: 16px !important; }
.mt-1 { margin-top: 4px !important; }

/* Typography */
.text-xl { font-size: 20px !important; line-height: 28px !important; }
.text-2xl { font-size: 24px !important; line-height: 32px !important; }
.text-sm { font-size: 14px !important; line-height: 20px !important; }
.font-bold { font-weight: 700 !important; }
.font-semibold { font-weight: 600 !important; }
.font-medium { font-weight: 500 !important; }

/* Width */
.w-full { width: 100% !important; }
`;
