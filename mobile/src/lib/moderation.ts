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

export function findBannedKeyword(input: string) {
  const text = normalize(input);
  if (!text) return null;
  return BANNED_KEYWORDS.find((word) => word && text.includes(normalize(word))) || null;
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
