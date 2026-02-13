import crypto from 'crypto';

export type ProvidedProfile = {
  fullName?: string;
  dateOfBirth?: string;
  nationalId?: string;
  country?: string;
};

export type DecisionLike = {
  id_verification?: {
    status?: string;
    document_type?: string;
    document_number?: string;
    personal_number?: string;
    issuing_country?: string;
    expiration_date?: string;
    expires_at?: string;
  };
  nfc?: {
    status?: string;
    chip_data?: {
      first_name?: string;
      last_name?: string;
      birth_date?: string;
      document_number?: string;
      issuing_country?: string;
      expiration_date?: string;
    };
  };
  expected_details?: {
    first_name?: string;
    last_name?: string;
  };
  face_match?: { score?: number };
  liveness?: { score?: number };
  status?: string;
};

export function sha256(s?: string) {
  if (!s) return undefined;
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function normalizeName(s?: string) {
  if (!s) return '';
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = new Set(a.split(' ').filter(Boolean));
  const B = new Set(b.split(' ').filter(Boolean));
  let hits = 0;
  for (const t of A) if (B.has(t)) hits++;
  return (2 * hits) / (A.size + B.size);
}

export function extractFromDecision(decision?: DecisionLike) {
  const chip = decision?.nfc?.chip_data;
  const idv = decision?.id_verification;
  const exp = idv?.expiration_date || idv?.expires_at || chip?.expiration_date;

  const first = chip?.first_name || decision?.expected_details?.first_name || '';
  const last = chip?.last_name || decision?.expected_details?.last_name || '';
  const full = [first, last].filter(Boolean).join(' ').trim();

  const docNum =
    idv?.document_number ||
    idv?.personal_number ||
    chip?.document_number ||
    undefined;

  return {
    fullName: full || undefined,
    firstName: first || undefined,
    lastName: last || undefined,
    dateOfBirth: chip?.birth_date || undefined,
    documentNumberHash: sha256(docNum),
    issuingCountry: idv?.issuing_country || chip?.issuing_country || undefined,
    expiresAt: exp || undefined,
  };
}

export function compareProvidedWithExtract(
  provided: ProvidedProfile,
  extracted: ReturnType<typeof extractFromDecision>,
  opts: { nameThreshold?: number } = {}
) {
  const nameA = normalizeName(provided.fullName);
  const nameB = normalizeName(extracted.fullName || '');
  const sim = tokenSimilarity(nameA, nameB);
  const nameMatch = nameA && nameB ? sim >= (opts.nameThreshold ?? 0.85) : true;

  const safeDate = (s?: string) => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  };
  const dobMatch =
    provided.dateOfBirth && extracted.dateOfBirth
      ? safeDate(provided.dateOfBirth) === safeDate(extracted.dateOfBirth)
      : true;

  const idHashMatch =
    provided.nationalId && extracted.documentNumberHash
      ? sha256(provided.nationalId) === extracted.documentNumberHash
      : true;

  const notExpired = (() => {
    if (!extracted.expiresAt) return true;
    const d = new Date(extracted.expiresAt);
    return Number.isNaN(d.getTime()) ? true : d.getTime() >= Date.now();
  })();

  const countryMatch =
    provided.country && extracted.issuingCountry
      ? extracted.issuingCountry.toUpperCase().startsWith(provided.country.toUpperCase())
      : true;

  const checks = {
    nameMatch,
    nameSimilarity: Number(sim.toFixed(2)),
    dobMatch,
    idHashMatch,
    notExpired,
    countryMatch,
  };

  const mismatches = Object.entries(checks)
    .filter(([k, v]) => k !== 'nameSimilarity' && v === false)
    .map(([k]) => k);

  const passed = mismatches.length === 0;

  return { checks, mismatches, passed };
}
