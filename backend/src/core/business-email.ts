const DEFAULT_CONSUMER_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'outlook.com',
  'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'proton.me', 'protonmail.com', 'zoho.com', 'gmx.com', 'mail.com',
];

export function getConsumerEmailDomains(): Set<string> {
  const configured = String(process.env.CONSUMER_EMAIL_DOMAINS || '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_CONSUMER_DOMAINS, ...configured]);
}

export function normalizeBusinessEmail(value: unknown): string | null {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const domain = email.slice(email.lastIndexOf('@') + 1);
  if (!domain || domain.length > 253 || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return null;
  const blocked = getConsumerEmailDomains();
  if ([...blocked].some((consumer) => domain === consumer || domain.endsWith(`.${consumer}`))) return null;
  return email;
}
