const BANNED_KEYWORDS = [
  'weapon', 'gun', 'firearm', 'knife', 'bomb', 'explosive', 'grenade', 'ammunition',
  'murder', 'kill', 'assassinate', 'terrorism', 'torture', 'shoot', 'massacre',
  'drugs', 'cocaine', 'heroin', 'meth', 'ecstasy', 'opioid', 'weed', 'marijuana',
  'cannabis', 'lsd', 'crack', 'hashish', 'psychedelic',
  'adult', 'porn', 'sex', 'xxx', 'nude', 'erotic', 'fetish', 'strip', 'escort',
  'prostitute', 'brothel', 'rape', 'nsfw', 'hentai',
  'gambling', 'casino', 'poker', 'betting', 'lottery', 'jackpot', 'roulette',
  'scam', 'fraud', 'phishing', 'hacking', 'malware', 'ransomware', 'fakeid',
  'counterfeit', 'forgery', 'steal', 'theft', 'creditcard',
  'hate', 'racism', 'homophobia', 'nazi', 'extremism',
  'selfharm', 'cutting', 'suicide', 'overdose', 'noose',
  'humantrafficking', 'smuggling', 'illegal', 'kidnap', 'blackmarket',
  'piracy', 'bribe', 'extortion', 'moneylaundering', 'cybercrime',
  'abortion', 'necrophilia', 'zoophilia', 'bestiality', 'pedophile',
  'childporn', 'underage', 'molest', 'mutilation', 'snuff',
  // Arabic keywords
  'سلاح', 'مسدس', 'بندقية', 'قنبلة', 'متفجرات', 'ذخيرة', 'رصاص',
  'قتل', 'اغتيال', 'إرهاب', 'إرهابي', 'داعش', 'القاعدة', 'تفجير',
  'مخدرات', 'حشيش', 'هيروين', 'كوكايين', 'ميث', 'ماريجوانا', 'قنب', 'إكستاسي',
  'جنس', 'سكس', 'إباحي', 'بورنو', 'عري', 'دعارة', 'اغتصاب',
  'قمار', 'رهان', 'كازينو', 'يانصيب', 'مقامرة',
  'احتيال', 'تزوير', 'نصب', 'خداع', 'غسيل', 'تبييض', 'رشوة',
  'عنصرية', 'كراهية', 'نازية', 'تطرف',
  'انتحار', 'إيذاء', 'خنق', 'شنق',
];

const normalize = (value: string) => String(value || '').trim().toLowerCase();
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isAsciiKeyword = (value: string) => /^[a-z0-9]+$/i.test(value);

export function findBannedKeyword(input: string) {
  const text = normalize(input);
  if (!text) return null;
  return (
    BANNED_KEYWORDS.find((word) => {
      const keyword = normalize(word);
      if (!keyword) return false;
      if (isAsciiKeyword(keyword)) {
        const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword)}([^a-z0-9]|$)`, 'i');
        return re.test(text);
      }
      return text.includes(keyword);
    }) || null
  );
}

export function findBannedKeywordInFields(fields: Array<{ label: string; value?: string }>) {
  for (const field of fields) {
    const keyword = field.value ? findBannedKeyword(field.value) : null;
    if (keyword) {
      return { field: field.label, keyword };
    }
  }
  return null;
}

export function hasLowQualityText(value: string, minLength = 3, minLetters = 2) {
  const text = String(value || '').trim();
  if (!text) return true;
  if (text.length < minLength) return true;
  const letters = (text.match(/\p{L}/gu) || []).length;
  if (letters < minLetters) return true;
  const symbols = (text.match(/[^\p{L}\p{N}\s]/gu) || []).length;
  if (symbols / Math.max(text.length, 1) > 0.45) return true;
  if (/([*#@!$%^&_=+~`|\\/.-])\1{2,}/.test(text)) return true;
  if (/(\p{L})\1{4,}/u.test(text)) return true;
  return false;
}
