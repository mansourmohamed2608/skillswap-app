const MIDDLE_EAST_TOKENS = new Set([
  'eg', 'egypt',
  'sa', 'saudi arabia',
  'ae', 'uae', 'united arab emirates',
  'kw', 'kuwait',
  'qa', 'qatar',
  'bh', 'bahrain',
  'om', 'oman',
  'jo', 'jordan',
  'lb', 'lebanon',
  'ps', 'palestine',
  'sy', 'syria',
  'iq', 'iraq',
  'ye', 'yemen',
  'il', 'israel',
  'tr', 'turkey',
  'ir', 'iran',
  'af', 'afghanistan',
  'pk', 'pakistan',
]);

export function isMiddleEastCountry(value: string | undefined | null): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return MIDDLE_EAST_TOKENS.has(normalized);
}

export function isMiddleEastLobbyEligible(value: string | undefined | null): boolean {
  return isMiddleEastCountry(value);
}
