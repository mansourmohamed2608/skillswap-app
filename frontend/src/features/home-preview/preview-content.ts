export type Locale = 'en' | 'ar';

export const sectionOrder = [
  'hero',
  'how-it-works',
  'categories',
  'featured-listings',
  'community-highlights',
  'get-app',
] as const;

// IDs and listing targets mirror the canonical backend category contract.
export const categories = [
  { id: 'content-creation', listingCategory: 'Content creation', label: { en: 'Content creation', ar: 'صناعة المحتوى' } },
  { id: 'reels-making', listingCategory: 'Reels making', label: { en: 'Reels making', ar: 'صناعة ريلز' } },
  { id: 'graphic-design', listingCategory: 'Graphic design', label: { en: 'Graphic design', ar: 'تصميم جرافيك' } },
  { id: 'copy-writing', listingCategory: 'Copy writing', label: { en: 'Copy writing', ar: 'كتابة محتوى' } },
  { id: 'beauty-and-makeup', listingCategory: 'Beauty and makeup', label: { en: 'Beauty and makeup', ar: 'الجمال والمكياج' } },
  { id: 'modeling', listingCategory: 'Modeling', label: { en: 'Modeling', ar: 'موديلينغ' } },
  { id: 'web-development-programming', listingCategory: 'Web development / programming', label: { en: 'Web development / programming', ar: 'تطوير الويب والبرمجة' } },
  { id: 'media-buying', listingCategory: 'Media buying', label: { en: 'Media buying', ar: 'شراء إعلامي' } },
  { id: 'social-media-management', listingCategory: 'Social media management', label: { en: 'Social media management', ar: 'إدارة وسائل التواصل' } },
  { id: 'dental-care', listingCategory: 'Dental care', label: { en: 'Dental care', ar: 'رعاية الأسنان' } },
  { id: 'medical-consultation', listingCategory: 'Medical consultation', label: { en: 'Medical consultation', ar: 'استشارة طبية' } },
  { id: 'babysitting', listingCategory: 'Babysitting', label: { en: 'Babysitting', ar: 'رعاية أطفال' } },
  { id: 'study-buddy', listingCategory: 'Study buddy', label: { en: 'Study buddy', ar: 'رفيق دراسة' } },
  { id: 'pets-zone', listingCategory: 'Pets zone', label: { en: 'Pets zone', ar: 'عالم الحيوانات الأليفة' } },
  { id: 'ladies-hangout', listingCategory: 'Ladies hangout', label: { en: 'Ladies hangout', ar: 'جلسة للسيدات' } },
  { id: 'delicious-food', listingCategory: 'Delicious food', label: { en: 'Delicious food', ar: 'طعام لذيذ' } },
  { id: 'sporty', listingCategory: 'Sporty', label: { en: 'Sporty', ar: 'رياضة' } },
  { id: 'hear-me-out-im-all-ears', listingCategory: 'Hear me out / I’m all ears', label: { en: 'Hear me out / I’m all ears', ar: 'أنا أستمع إليك' } },
  { id: 'diet-guide', listingCategory: 'Diet guide', label: { en: 'Diet guide', ar: 'دليل غذائي' } },
  { id: 'share-a-ride-carpooling', listingCategory: 'Share a ride / Carpooling', label: { en: 'Share a ride / Carpooling', ar: 'مشاركة رحلة' } },
  { id: 'hobby-and-happy', listingCategory: 'Hobby and happy', label: { en: 'Hobby and happy', ar: 'هواية وسعادة' } },
  { id: 'business-consulting', listingCategory: 'Business consulting', label: { en: 'Business consulting', ar: 'استشارات أعمال' } },
  { id: 'photography', listingCategory: 'Photography', label: { en: 'Photography', ar: 'تصوير فوتوغرافي' } },
  { id: 'videography', listingCategory: 'Videography', label: { en: 'Videography', ar: 'تصوير فيديو' } },
  { id: 'video-editing', listingCategory: 'Video editing', label: { en: 'Video editing', ar: 'مونتاج فيديو' } },
  { id: 'home-office-repair', listingCategory: 'Home / Office repair', label: { en: 'Home / Office repair', ar: 'إصلاح المنزل والمكتب' } },
  { id: 'ai-services', listingCategory: 'AI services', label: { en: 'AI services', ar: 'خدمات الذكاء الاصطناعي' } },
  { id: 'teaching', listingCategory: 'Teaching', label: { en: 'Teaching', ar: 'التدريس' } },
  { id: 'other', listingCategory: 'Other', label: { en: 'Other', ar: 'أخرى' } },
] as const;

export const listings = [
  { id: 'preview-bicycle-repair', categoryId: 'home-repair', category: { en: 'Home Repair', ar: 'إصلاحات المنزل' }, title: { en: 'Bicycle Tune-Up Basics', ar: 'أساسيات صيانة الدراجة' }, description: { en: 'Learn a practical brake and gear check for everyday riding.', ar: 'تعلم فحصًا عمليًا للمكابح والتروس للاستخدام اليومي.' }, offer: { en: 'Brake checks and simple adjustments', ar: 'فحص المكابح والتعديلات البسيطة' }, lookingFor: { en: 'Conversational English practice', ar: 'تدريب على المحادثة بالإنجليزية' }, owner: { en: 'Omar Khalil', ar: 'عمر خليل' }, location: { en: 'Nasr City, Cairo', ar: 'مدينة نصر، القاهرة' }, image: '/design-preview/home/v3-bicycle-tools.png' },
  { id: 'preview-pottery', categoryId: 'design', category: { en: 'Craft & Design', ar: 'الحرف والتصميم' }, title: { en: 'Pottery Wheel for Beginners', ar: 'أساسيات عجلة الفخار للمبتدئين' }, description: { en: 'Get comfortable with clay preparation and the first pull.', ar: 'تعرف على تحضير الطين وأول خطوات التشكيل.' }, offer: { en: 'Clay preparation and wheel basics', ar: 'تحضير الطين وأساسيات العجلة' }, lookingFor: { en: 'Simple portfolio photography', ar: 'تصوير بسيط لملف الأعمال' }, owner: { en: 'Mariam Adel', ar: 'مريم عادل' }, location: { en: 'Zamalek, Cairo', ar: 'الزمالك، القاهرة' }, image: '/design-preview/home/v3-pottery-finished.png' },
  { id: 'preview-web-coaching', categoryId: 'web-development', category: { en: 'Web Development', ar: 'تطوير الويب' }, title: { en: 'Accessible Website Coaching', ar: 'تدريب على تطوير مواقع سهلة الوصول' }, description: { en: 'Build a clearer, more inclusive interface with practical guidance.', ar: 'ابن واجهة أوضح وأكثر شمولًا بإرشاد عملي.' }, offer: { en: 'HTML, CSS, and accessibility guidance', ar: 'إرشاد في HTML وCSS وسهولة الوصول' }, lookingFor: { en: 'Help tuning up a bicycle', ar: 'مساعدة في صيانة الدراجة' }, owner: { en: 'Youssef Nabil', ar: 'يوسف نبيل' }, location: { en: 'Maadi, Cairo', ar: 'المعادي، القاهرة' }, image: '/design-preview/home/v3-web-accessibility.png' },
  { id: 'preview-brand-design', categoryId: 'graphic-design', category: { en: 'Graphic Design', ar: 'التصميم الجرافيكي' }, title: { en: 'Brand Starter Kit', ar: 'حزمة بداية لهويتك البصرية' }, description: { en: 'Shape a simple visual direction for a new local project.', ar: 'صمم اتجاهًا بصريًا بسيطًا لمشروع محلي جديد.' }, offer: { en: 'A simple logo and color direction', ar: 'شعار بسيط واتجاه للألوان' }, lookingFor: { en: 'Home plant care', ar: 'العناية بالنباتات المنزلية' }, owner: { en: 'Salma Hassan', ar: 'سلمى حسن' }, location: { en: 'Heliopolis, Cairo', ar: 'مصر الجديدة، القاهرة' }, image: undefined },
] as const;

export const previewHighlights = [
  { name: { en: 'Dina Farid', ar: 'دينا فريد' }, skill: { en: 'Cooking lessons', ar: 'دروس الطبخ' }, story: { en: 'A recipe exchange that became a weekly neighborhood class.', ar: 'تبادل وصفات أصبح درسًا أسبوعيًا في الحي.' } },
  { name: { en: 'Karim Samir', ar: 'كريم سمير' }, skill: { en: 'Photography help', ar: 'مساعدة في التصوير' }, story: { en: 'A portfolio shoot traded for a bike safety lesson.', ar: 'جلسة تصوير لملف أعمال مقابل درس في أمان الدراجة.' } },
] as const;

export const copy = {
  en: {
    previewLabel: 'Preview mode', guest: 'Guest', member: 'Member', guestPreview: 'Guest preview', memberPreview: 'Member preview', signIn: 'Sign In', account: 'Account', messages: 'Messages', signOut: 'Sign Out', title: 'R&O', heroLine1: 'Request the service you need', heroLine2: 'Offer what you can give in return whether it is a service, a product or a fee!', heroLine3: 'Connect with people who are close to your location and make the success happen and thrive together!',
    join: 'Join', joinNow: 'Join R&O', startSwapping: 'Start Swapping', post: 'Post a listing', browse: 'Browse Listings', subscribeNow: 'Subscribe Now', message: 'Message', details: 'View Details',
    searchLabel: 'Search skills, services, or listings', searchPlaceholder: 'Search skills or services', searchEmpty: 'No preview matches yet.', viewAllFor: 'View all results for', categoryResult: 'Browse category', listingResult: 'Preview listing', searchButton: 'Open search', close: 'Close',
    howTitle: 'How R&O Works', howBody: '', steps: [
      { title: 'Request & Offer', body: 'Post a listing, request the service you need and offer what you can give in return whether it is a service, a product or a fee. Be specific to attract the right swaps!' }, { title: 'Find a Match', body: 'Find the closest people to your location who are offering the same service you’re looking for! You can browse listings by category or use our AI Matchmaker to find potential exchanges based on your profile.' }, { title: 'Connect & Swap', body: 'Use our in-app chat to discuss details and to agree on your service exchange. Happy swapping!' },
    ],
    categoriesTitle: 'Explore what people around you share', categoriesBody: 'Be a part of our growing and vibrant community that is full of positive, successful and collaborative opportunities and members!', viewMore: 'See More', viewLess: 'See Less',
    featuredTitle: 'Featured listings', featuredBody: 'Practical offers with a clear exchange in mind.', request: 'Request', offer: 'Offer', viewAll: 'View More', previous: 'Previous listing', next: 'Next listing', slideFeedback: 'Showing listing {current} of {total}',
    highlightsTitle: 'Community highlights', previewExamples: 'Preview examples - not live ratings or activity', previewMemberExample: 'Preview member example', previewSwapStory: 'Preview swap story',
    appTitle: 'Ready to share something useful?', appBody: 'Start with an offer, a request, or a listing worth exploring.', appAvailability: 'Preview-only app availability',
    footerExplore: 'Explore', footerCategories: 'Categories', footerHelp: 'Help', footerAbout: 'About', footerLegal: 'Legal', language: 'Language', getApp: 'Get the App',
  },
  ar: {
    previewLabel: 'وضع المعاينة', guest: 'زائر', member: 'عضو', guestPreview: 'معاينة الزائر', memberPreview: 'معاينة العضو', signIn: 'تسجيل الدخول', account: 'الحساب', messages: 'الرسائل', signOut: 'تسجيل الخروج', title: 'R&O', heroLine1: 'اطلب الخدمة التي تحتاجها', heroLine2: 'اعرض ما يمكنك تقديمه في المقابل، سواء كانت خدمة أو منتجًا أو مبلغًا ماليًا!', heroLine3: 'تواصل مع أشخاص قريبين من موقعك واصنعوا النجاح وازدهروا معًا!',
    join: 'انضم', joinNow: 'انضم إلى R&O', startSwapping: 'ابدأ التبادل', post: 'انشر عرضًا', browse: 'تصفح العروض', subscribeNow: 'اشترك الآن', message: 'راسل', details: 'عرض التفاصيل',
    searchLabel: 'ابحث عن مهارات أو خدمات أو إعلانات', searchPlaceholder: 'ابحث عن مهارة أو خدمة', searchEmpty: 'لا توجد نتائج تجريبية بعد.', viewAllFor: 'عرض كل النتائج عن', categoryResult: 'تصفح الفئة', listingResult: 'إعلان تجريبي', searchButton: 'فتح البحث', close: 'إغلاق',
    howTitle: 'كيف يعمل R&O', howBody: '', steps: [
      { title: 'اطلب واعرض', body: 'انشر عرضًا، واطلب الخدمة التي تحتاجها، واعرض ما يمكنك تقديمه في المقابل سواء كانت خدمة أو منتجًا أو مبلغًا ماليًا. كن محددًا لجذب التبادلات المناسبة!' }, { title: 'اعثر على تطابق', body: 'اعثر على أقرب الأشخاص إلى موقعك ممن يقدمون الخدمة نفسها التي تبحث عنها! يمكنك تصفح العروض حسب الفئة أو استخدام المطابقة بالذكاء الاصطناعي للعثور على تبادلات مناسبة لملفك.' }, { title: 'تواصل وتبادل', body: 'استخدم الدردشة داخل التطبيق لمناقشة التفاصيل والاتفاق على تبادل خدمتك. تبادل سعيد!' },
    ],
    categoriesTitle: 'استكشف ما يشاركه الناس من حولك', categoriesBody: 'كن جزءًا من مجتمعنا المتنامي والحيوي المليء بالفرص الإيجابية والناجحة والتعاونية والأعضاء!', viewMore: 'عرض المزيد', viewLess: 'عرض أقل',
    featuredTitle: 'إعلانات مميزة', featuredBody: 'عروض عملية مع تبادل واضح في الاعتبار.', request: 'الطلب', offer: 'العرض', viewAll: 'عرض المزيد', previous: 'الإعلان السابق', next: 'الإعلان التالي', slideFeedback: 'عرض الإعلان {current} من {total}',
    highlightsTitle: 'أبرز ما في المجتمع', previewExamples: 'أمثلة للمعاينة - ليست تقييمات أو نشاطًا مباشرًا', previewMemberExample: 'مثال عضو للمعاينة', previewSwapStory: 'قصة تبادل للمعاينة',
    appTitle: 'هل أنت مستعد لمشاركة شيء مفيد؟', appBody: 'ابدأ بعرض أو طلب أو إعلان يستحق الاستكشاف.', appAvailability: 'توفر التطبيق للمعاينة فقط',
    footerExplore: 'استكشف', footerCategories: 'الفئات', footerHelp: 'المساعدة', footerAbout: 'حول', footerLegal: 'القانونية', language: 'اللغة', getApp: 'احصل على التطبيق',
  },
} as const;

export function getSearchSuggestions(query: string, locale: Locale) {
  const normalized = query.trim().toLocaleLowerCase(locale === 'ar' ? 'ar' : 'en');
  if (!normalized) return [];
  return [
    ...categories.filter((item) => item.label[locale].toLocaleLowerCase().includes(normalized)).map((item) => ({ id: `category-${item.id}`, label: item.label[locale], meta: copy[locale].categoryResult, href: `/listings?category=${encodeURIComponent(item.listingCategory)}` })),
    ...listings.filter((item) => [item.title[locale], item.offer[locale], item.lookingFor[locale], item.location[locale]].some((value) => value.toLocaleLowerCase().includes(normalized))).map((item) => ({ id: `listing-${item.id}`, label: item.title[locale], meta: copy[locale].listingResult, href: `/listings?category=${encodeURIComponent(item.category.en)}` })),
  ].slice(0, 6);
}

export function getCategoryFallback(categoryId: string) {
  // Reuse the approved dimensional illustration set; every canonical category
  // resolves to an intentional visual rather than a generic fallback.
  const mapping: Record<string, string> = {
    'study-buddy': '/design-preview/home/v5/category-tutoring.webp', modeling: '/design-preview/home/v5/category-design.webp', 'pets-zone': '/design-preview/home/v5/category-home-living.webp', 'ladies-hangout': '/design-preview/home/v5/category-home-living.webp',
    'delicious-food': '/design-preview/home/v5/category-home-living.webp', 'medical-consultation': '/design-preview/home/v5/category-tech-support.webp', 'dental-care': '/design-preview/home/v5/category-tech-support.webp', sporty: '/design-preview/home/v5/category-fitness-wellness.webp',
    'hear-me-out-im-all-ears': '/design-preview/home/v5/category-home-living.webp', babysitting: '/design-preview/home/v5/category-education.webp', 'diet-guide': '/design-preview/home/v5/category-fitness-wellness.webp', 'share-a-ride-carpooling': '/design-preview/home/v5/category-home-living.webp',
    'beauty-and-makeup': '/design-preview/home/v5/category-design.webp', 'hobby-and-happy': '/design-preview/home/v5/category-music-audio.webp', 'business-consulting': '/design-preview/home/v5/category-business-career.webp', 'graphic-design': '/design-preview/home/v5/category-graphic-design.webp',
    'content-creation': '/design-preview/home/v5/category-photography-video.webp', 'copy-writing': '/design-preview/home/v5/category-education.webp', photography: '/design-preview/home/v5/category-photography-video.webp', videography: '/design-preview/home/v5/category-photography-video.webp',
    'reels-making': '/design-preview/home/v5/category-photography-video.webp', 'video-editing': '/design-preview/home/v5/category-photography-video.webp', 'social-media-management': '/design-preview/home/v5/category-business-career.webp', 'media-buying': '/design-preview/home/v5/category-business-career.webp',
    'web-development-programming': '/design-preview/home/v5/category-web-development.webp', 'home-office-repair': '/design-preview/home/v5/category-home-repair.webp', 'ai-services': '/design-preview/home/v5/category-tech-support.webp', teaching: '/design-preview/home/v5/category-education.webp', other: '/design-preview/home/v5/category-home-living.webp',
  };
  return mapping[categoryId] ?? '/design-preview/home/v2-design-fallback.webp';
}
