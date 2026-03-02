
'use client';

import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import Image from 'next/image';
import { getServiceCategoryLabel, serviceCategories } from '@/services/serviceCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PlusCircleIcon, AlertCircleIcon, RepeatIcon, UploadCloudIcon, LocateFixedIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { ApiError, createListing, updateListing } from '@/services/api';
import { db, storage } from '@/services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useMembership } from '@/hooks/useMembership';
import { useTranslation } from 'react-i18next';
import type { ServiceListing } from '@/types';
import { getErrorMessage } from '@/lib/errors';
import { findBannedKeywordInFields, hasLowQualityText } from '@/lib/moderation';
import { isCoordinatePair } from '@/lib/location';
import { getListingPath } from '@/lib/public-ids';

type NewListingFormProps = {
  initialListing?: ServiceListing | null;
  listingId?: string;
};

function SubmitButton({ loading, isEdit }: { loading: boolean; isEdit: boolean }) {
  const { t } = useTranslation();
  return (
    <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isEdit ? t('listings.form.updating') : t('listings.form.creating')}
        </>
      ) : (
        <>
          <PlusCircleIcon className="mr-2 h-4 w-4" /> {isEdit ? t('listings.form.update') : t('listings.form.create')}
        </>
      )}
    </Button>
  );
}

export function NewListingForm({ initialListing, listingId }: NewListingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { active, loading: membershipLoading, membership } = useMembership();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // form fields
  const [offeredServiceTitle, setOfferedServiceTitle] = useState('');
  const [offeredServiceCategory, setOfferedServiceCategory] = useState<string | undefined>();
  const [offeredServiceDescription, setOfferedServiceDescription] = useState('');
  const [requestedServiceTitle, setRequestedServiceTitle] = useState('');
  const [requestedServiceCategory, setRequestedServiceCategory] = useState<string | undefined>();
  const [requestedServiceDescription, setRequestedServiceDescription] = useState('');
  const [requestedKind, setRequestedKind] = useState<'service' | 'product' | 'money'>('service');
  const [requestedProductName, setRequestedProductName] = useState('');
  const [requestedProductDescription, setRequestedProductDescription] = useState('');
  const [requestedMoneyAmount, setRequestedMoneyAmount] = useState('');
  const [requestedMoneyCurrency, setRequestedMoneyCurrency] = useState('USD');
  const [location, setLocation] = useState('');
  const [geo, setGeo] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [locationSource, setLocationSource] = useState<'none' | 'manual' | 'gps'>('none');
  const [locating, setLocating] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [locationHintTone, setLocationHintTone] = useState<'neutral' | 'warning' | 'success'>('neutral');
  const [offeredFile, setOfferedFile] = useState<File | null>(null);
  const [offeredFileName, setOfferedFileName] = useState('');
  const isBusiness = membership?.plan === 'Business' && active;
  const autoLocationRequestedRef = useRef(false);
  const offeredFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isBusiness || !user || !db) {
        if (mounted) setCustomCategories([]);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data: any = snap.exists() ? snap.data() : {};
        const raw = data?.businessProfile?.customCategories;
        const next = Array.isArray(raw)
          ? raw.map((item) => String(item || '').trim()).filter(Boolean)
          : [];
        if (mounted) setCustomCategories(next);
      } catch {
        if (mounted) setCustomCategories([]);
      }
    })();
    return () => { mounted = false; };
  }, [isBusiness, user]);

  const categoryOptions = useMemo(() => {
    const extras = [
      initialListing?.offeredService?.category,
      initialListing?.requestedService?.category,
      ...customCategories,
    ].map((item) => String(item || '').trim()).filter(Boolean);
    const combined = [...serviceCategories, ...extras];
    return Array.from(new Set(combined));
  }, [customCategories, initialListing?.offeredService?.category, initialListing?.requestedService?.category]);

  const localizedCategoryOptions = useMemo(() => {
    return categoryOptions.map((value) => ({
      value,
      label: getServiceCategoryLabel(value, t),
    }));
  }, [categoryOptions, t]);

  useEffect(() => {
    if (!initialListing) return;
    setOfferedServiceTitle(initialListing.offeredService?.title || '');
    setOfferedServiceCategory(initialListing.offeredService?.category || undefined);
    setOfferedServiceDescription(initialListing.offeredService?.description || '');
    setRequestedServiceTitle(initialListing.requestedService?.title || '');
    setRequestedServiceCategory(initialListing.requestedService?.category || undefined);
    setRequestedServiceDescription(initialListing.requestedService?.description || '');
    const inferredKind =
      initialListing.requestedKind ||
      (String(initialListing.requestedService?.category || '').toLowerCase() === 'money'
        ? 'money'
        : String(initialListing.requestedService?.category || '').toLowerCase() === 'product'
          ? 'product'
          : 'service');
    const kind = inferredKind as 'service' | 'product' | 'money';
    setRequestedKind(kind);
    setRequestedProductName(initialListing.requestedProduct?.name || '');
    setRequestedProductDescription(initialListing.requestedProduct?.description || '');
    setRequestedMoneyAmount(
      initialListing.requestedMoney?.amount !== undefined && initialListing.requestedMoney?.amount !== null
        ? String(initialListing.requestedMoney.amount)
        : ''
    );
    setRequestedMoneyCurrency(initialListing.requestedMoney?.currency || 'USD');
    const initialLocation = initialListing.location || '';
    const initialLocationText = isCoordinatePair(initialLocation) ? '' : initialLocation;
    setLocation(initialLocationText);
    setLocationSource(
      initialLocationText.trim()
        ? 'manual'
        : initialListing.geo
          ? 'gps'
          : 'none'
    );
    setGeo(initialListing.geo);
    setExistingImageUrl(initialListing.offeredService?.imageUrl || undefined);
    setImagePreview(initialListing.offeredService?.imageUrl || null);
  }, [initialListing]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOfferedFile(file);
      setOfferedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(existingImageUrl || null);
      setOfferedFile(null);
      setOfferedFileName('');
    }
  };

  async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('zoom', '12');
      url.searchParams.set('addressdetails', '1');
      const res = await fetch(url.toString(), {
        headers: {
          'Accept-Language': i18n.resolvedLanguage || i18n.language || 'en',
        },
      });
      if (!res.ok) return undefined;
      const data: any = await res.json();
      const address = data?.address || {};
      const city = String(address.city || address.town || address.village || address.state_district || '').trim();
      const state = String(address.state || '').trim();
      const country = String(address.country || '').trim();
      const parts = [city, state, country].filter(Boolean);
      if (parts.length) return Array.from(new Set(parts)).join(', ');
      const display = String(data?.display_name || '').trim();
      if (!display) return undefined;
      const compact = display.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 3).join(', ');
      return compact || undefined;
    } catch {
      return undefined;
    }
  }

  async function fetchCurrentLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationHintTone('warning');
      setLocationHint(t('listings.form.locationUnsupported'));
      return;
    }
    setLocating(true);
    setLocationHint(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setLocationHintTone('warning');
          setLocationHint(t('listings.form.locationReadFailed'));
          setLocating(false);
          return;
        }
        setGeo({ lat, lng });
        setLocationSource('gps');
        const resolvedLocation = await reverseGeocode(lat, lng);
        if (resolvedLocation) {
          setLocation(resolvedLocation);
        }
        setLocationHintTone('success');
        setLocationHint(
          resolvedLocation
            ? t('listings.form.locationCapturedWithAddress', { location: resolvedLocation })
            : t('listings.form.locationCaptured')
        );
        setLocating(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationHintTone('warning');
          setLocationHint(t('listings.form.locationPermissionDenied'));
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationHintTone('warning');
          setLocationHint(t('listings.form.locationUnavailable'));
        } else if (error.code === error.TIMEOUT) {
          setLocationHintTone('warning');
          setLocationHint(t('listings.form.locationTimeout'));
        } else {
          setLocationHintTone('warning');
          setLocationHint(t('listings.form.locationUnknownError'));
        }
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  useEffect(() => {
    if (autoLocationRequestedRef.current) return;
    if (!user) return;
    if (initialListing) return;
    if (location.trim() || geo) return;
    autoLocationRequestedRef.current = true;
    void fetchCurrentLocation();
    // Intentionally run once when create form is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initialListing, location, geo]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!geo || locationSource !== 'gps') return;
      const resolvedLocation = await reverseGeocode(geo.lat, geo.lng);
      if (!mounted || !resolvedLocation) return;
      setLocation(resolvedLocation);
      setLocationHintTone('success');
      setLocationHint(t('listings.form.locationCapturedWithAddress', { location: resolvedLocation }));
    })();
    return () => {
      mounted = false;
    };
  }, [geo, i18n.resolvedLanguage, locationSource, t]);
  
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    if (!user) {
      setMessage(t('listings.form.signInRequired'));
      return;
    }
    if (membershipLoading) return; // wait for membership state
    // Redirect only when the user attempts the action and is not subscribed
    if (active === false) { router.push('/pricing?alert=sub-required'); return; }
    if (!offeredServiceTitle.trim() || !offeredServiceCategory || !offeredServiceDescription.trim()) {
      setMessage(t('listings.form.completeOfferedDetails'));
      return;
    }
    if (!location.trim() && !geo) {
      setMessage(t('listings.form.locationRequired'));
      return;
    }
    if (requestedKind === 'service') {
      if (!requestedServiceTitle.trim() || !requestedServiceCategory || !requestedServiceDescription.trim()) {
        setMessage(t('listings.form.completeRequestedServiceDetails'));
        return;
      }
    } else if (requestedKind === 'product') {
      if (!requestedProductName.trim()) {
        setMessage(t('listings.form.requestedProductNameRequired'));
        return;
      }
    } else {
      const amount = Number(requestedMoneyAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setMessage(t('listings.form.requestedAmountInvalid'));
        return;
      }
      if (!requestedMoneyCurrency.trim()) {
        setMessage(t('listings.form.requestedCurrencyRequired'));
        return;
      }
    }
    const banned = findBannedKeywordInFields([
      { label: 'offeredService.title', value: offeredServiceTitle },
      { label: 'offeredService.description', value: offeredServiceDescription },
      { label: 'requestedService.title', value: requestedServiceTitle },
      { label: 'requestedService.description', value: requestedServiceDescription },
      { label: 'requestedProduct.name', value: requestedProductName },
      { label: 'requestedProduct.description', value: requestedProductDescription },
    ]);
    if (banned) {
      setMessage(t('errors.codes.content/banned'));
      return;
    }
    const lowQualityFields: Array<{ label: string; value: string; minLength?: number; minLetters?: number }> = [
      { label: 'offeredService.title', value: offeredServiceTitle, minLength: 3, minLetters: 2 },
      { label: 'offeredService.description', value: offeredServiceDescription, minLength: 8, minLetters: 4 },
    ];
    if (requestedKind === 'service') {
      lowQualityFields.push(
        { label: 'requestedService.title', value: requestedServiceTitle, minLength: 2, minLetters: 2 },
        { label: 'requestedService.description', value: requestedServiceDescription, minLength: 4, minLetters: 3 },
      );
    }
    if (requestedKind === 'product') {
      lowQualityFields.push({ label: 'requestedProduct.name', value: requestedProductName, minLength: 2, minLetters: 2 });
    }
    const lowQuality = lowQualityFields.find((field) =>
      hasLowQualityText(field.value, field.minLength, field.minLetters)
    );
    if (lowQuality) {
      setMessage('Please add clearer, meaningful text before submitting.');
      return;
    }
    try {
      setCreating(true);
      // Upload optional image
      let imageUrl: string | undefined = existingImageUrl;
      if (offeredFile && storage) {
        const fileRef = ref(storage, `listings/${user.uid}/${Date.now()}-${offeredFile.name}`);
        await uploadBytes(fileRef, offeredFile);
        imageUrl = await getDownloadURL(fileRef);
      }

      let requestedServicePayload: { title: string; category: string; description: string };
      let requestedProductPayload: { name: string; description?: string } | undefined;
      let requestedMoneyPayload: { amount: number; currency: string } | undefined;
      if (requestedKind === 'service') {
        requestedServicePayload = {
          title: requestedServiceTitle,
          category: requestedServiceCategory!,
          description: requestedServiceDescription,
        };
      } else if (requestedKind === 'product') {
        requestedProductPayload = {
          name: requestedProductName.trim(),
          description: requestedProductDescription.trim() || undefined,
        };
        requestedServicePayload = {
          title: requestedProductPayload.name,
          category: 'Product',
          description: requestedProductPayload.description || 'Product exchange',
        };
      } else {
        requestedMoneyPayload = {
          amount: Number(requestedMoneyAmount),
          currency: requestedMoneyCurrency.trim().toUpperCase(),
        };
        requestedServicePayload = {
          title: `${requestedMoneyPayload.amount} ${requestedMoneyPayload.currency}`,
          category: 'Money',
          description: 'Cash payment exchange',
        };
      }

      // Build the nested listing structure expected by the UI and data layer
      const listing = {
        offeredService: {
          title: offeredServiceTitle,
          category: offeredServiceCategory!,
          description: offeredServiceDescription,
          imageUrl,
        },
        requestedService: requestedServicePayload,
        requestedKind,
        requestedProduct: requestedProductPayload,
        requestedMoney: requestedMoneyPayload,
        location: location.trim(),
        geo,
        status: 'open' as const,
        postedDate: new Date().toISOString(),
      };
      if (listingId) {
        await updateListing(listingId, listing);
        toast({ title: t('listings.form.updatedTitle'), description: t('listings.form.updatedDescription') });
        router.push(getListingPath({ id: listingId, publicId: initialListing?.publicId, offeredService: listing.offeredService }));
      } else {
        // Call backend endpoint which enforces membership and bypasses Firestore rules
        const created = await createListing(listing);
        toast({ title: t('listings.form.successTitle'), description: t('listings.form.successDescription') });
        router.push(getListingPath({ id: created.id, publicId: created.publicId, offeredService: listing.offeredService }));
        // Reset form
        setOfferedServiceTitle('');
        setOfferedServiceCategory(undefined);
        setOfferedServiceDescription('');
        setRequestedServiceTitle('');
        setRequestedServiceCategory(undefined);
        setRequestedServiceDescription('');
        setRequestedKind('service');
        setRequestedProductName('');
        setRequestedProductDescription('');
        setRequestedMoneyAmount('');
        setRequestedMoneyCurrency('USD');
        setLocation('');
        setLocationSource('none');
        setGeo(undefined);
        setOfferedFile(null);
        setOfferedFileName('');
        setImagePreview(null);
        setExistingImageUrl(undefined);
        setLocationHint(null);
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        router.push('/pricing?alert=sub-required');
        return;
      }
      if (err instanceof ApiError && (err.code === 'content/banned' || err.message === 'content/banned')) {
        const blocked = err.keyword ? ` (${err.keyword})` : '';
        setMessage(`${t('errors.codes.content/banned')}${blocked}`);
        return;
      }
      setMessage(getErrorMessage(err, t('listings.form.errorGeneric')));
    } finally {
      setCreating(false);
    }
  }


  return (
    <form onSubmit={onSubmit} noValidate>
      <Card className="shadow-xl">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 items-start">
          {/* Offered Service Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary border-b pb-2">{t('listings.form.offerSection')}</h3>
            <div className="space-y-1">
              <Label htmlFor="offeredServiceTitle">{t('listings.form.titleLabel')}</Label>
              <Input id="offeredServiceTitle" placeholder={t('listings.form.offerTitlePlaceholder')} value={offeredServiceTitle} onChange={(e)=>setOfferedServiceTitle(e.target.value)} />
              {errors?.offeredServiceTitle && <p className="text-sm text-destructive">{errors.offeredServiceTitle.join(', ')}</p>}
            </div>
             <div className="space-y-1">
              <Label htmlFor="offeredServiceCategory">{t('listings.form.categoryLabel')}</Label>
                <Select value={offeredServiceCategory} onValueChange={setOfferedServiceCategory}>
                  <SelectTrigger><SelectValue placeholder={t('listings.form.categoryPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {localizedCategoryOptions.map((category) => (
                      <SelectItem key={`offered-${category.value}`} value={category.value}>{category.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
               {errors?.offeredServiceCategory && <p className="text-sm text-destructive">{errors.offeredServiceCategory.join(', ')}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="offeredServiceDescription">{t('listings.form.descriptionLabel')}</Label>
              <Textarea id="offeredServiceDescription" placeholder={t('listings.form.offerDescriptionPlaceholder')} rows={4} value={offeredServiceDescription} onChange={(e)=>setOfferedServiceDescription(e.target.value)} />
              {errors?.offeredServiceDescription && <p className="text-sm text-destructive">{errors.offeredServiceDescription.join(', ')}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="offeredServiceImage">{t('listings.form.imageLabel')}</Label>
                <Input
                  id="offeredServiceImage"
                  ref={offeredFileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="rounded-lg border border-dashed border-border p-3">
                  <div className="flex items-center gap-3">
                    {imagePreview ? (
                      <Image src={imagePreview} alt={t('listings.form.imageAlt')} width={80} height={80} className="rounded-md object-cover" data-ai-hint="service photo" />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                        <UploadCloudIcon className="h-8 w-8" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {offeredFileName || t('listings.form.imageNoFile')}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('listings.form.imageFormatsHint')}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => offeredFileInputRef.current?.click()}
                    >
                      <UploadCloudIcon className="mr-2 h-4 w-4" />
                      {imagePreview ? t('listings.form.imageChange') : t('listings.form.imageChoose')}
                    </Button>
                    {imagePreview ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setOfferedFile(null);
                          setOfferedFileName('');
                          setImagePreview(existingImageUrl || null);
                          if (offeredFileInputRef.current) offeredFileInputRef.current.value = '';
                        }}
                      >
                        {t('listings.form.imageClear')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {errors?.offeredServiceImage && <p className="text-sm text-destructive">{errors.offeredServiceImage.join(', ')}</p>}
            </div>
          </div>
          
          {/* Requested Service Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-accent border-b pb-2 flex items-center gap-2">
              <RepeatIcon className="h-5 w-5"/>
              {t('listings.form.requestSection')}
            </h3>
            <div className="space-y-1">
              <Label htmlFor="requestedKind">{t('listings.form.exchangeTypeLabel')}</Label>
               <Select value={requestedKind} onValueChange={(value) => setRequestedKind(value as 'service' | 'product' | 'money')}>
                  <SelectTrigger id="requestedKind"><SelectValue placeholder={t('listings.form.exchangeTypePlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">{t('listings.form.exchangeTypeService')}</SelectItem>
                    <SelectItem value="product">{t('listings.form.exchangeTypeProduct')}</SelectItem>
                    <SelectItem value="money">{t('listings.form.exchangeTypeMoney')}</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            {requestedKind === 'service' ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="requestedServiceTitle">{t('listings.form.titleLabel')}</Label>
                  <Input id="requestedServiceTitle" placeholder={t('listings.form.requestTitlePlaceholder')} value={requestedServiceTitle} onChange={(e)=>setRequestedServiceTitle(e.target.value)} />
                  {errors?.requestedServiceTitle && <p className="text-sm text-destructive">{errors.requestedServiceTitle.join(', ')}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="requestedServiceCategory">{t('listings.form.categoryLabel')}</Label>
                  <Select value={requestedServiceCategory} onValueChange={setRequestedServiceCategory}>
                    <SelectTrigger><SelectValue placeholder={t('listings.form.categoryPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      {localizedCategoryOptions.map((category) => (
                        <SelectItem key={`requested-${category.value}`} value={category.value}>{category.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors?.requestedServiceCategory && <p className="text-sm text-destructive">{errors.requestedServiceCategory.join(', ')}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="requestedServiceDescription">{t('listings.form.descriptionLabel')}</Label>
                  <Textarea id="requestedServiceDescription" placeholder={t('listings.form.requestDescriptionPlaceholder')} rows={4} value={requestedServiceDescription} onChange={(e)=>setRequestedServiceDescription(e.target.value)} />
                  {errors?.requestedServiceDescription && <p className="text-sm text-destructive">{errors.requestedServiceDescription.join(', ')}</p>}
                </div>
              </>
            ) : null}
            {requestedKind === 'product' ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="requestedProductName">{t('listings.form.requestedProductNameLabel')}</Label>
                  <Input
                    id="requestedProductName"
                    placeholder={t('listings.form.requestedProductNamePlaceholder')}
                    value={requestedProductName}
                    onChange={(e) => setRequestedProductName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="requestedProductDescription">{t('listings.form.requestedProductDetailsLabel')}</Label>
                  <Textarea
                    id="requestedProductDescription"
                    placeholder={t('listings.form.requestedProductDetailsPlaceholder')}
                    rows={4}
                    value={requestedProductDescription}
                    onChange={(e) => setRequestedProductDescription(e.target.value)}
                  />
                </div>
              </>
            ) : null}
            {requestedKind === 'money' ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="requestedMoneyAmount">{t('listings.form.requestedAmountLabel')}</Label>
                  <Input
                    id="requestedMoneyAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t('listings.form.requestedAmountPlaceholder')}
                    value={requestedMoneyAmount}
                    onChange={(e) => setRequestedMoneyAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="requestedMoneyCurrency">{t('listings.form.requestedCurrencyLabel')}</Label>
                  <Input
                    id="requestedMoneyCurrency"
                    placeholder={t('listings.form.requestedCurrencyPlaceholder')}
                    value={requestedMoneyCurrency}
                    onChange={(e) => setRequestedMoneyCurrency(e.target.value.toUpperCase())}
                  />
                </div>
              </>
            ) : null}
             <div className="space-y-1 !mt-12">
                <Label htmlFor="location">{t('listings.form.locationLabel')}</Label>
                <Input
                  id="location"
                  placeholder={t('listings.form.locationPlaceholder')}
                  value={location}
                  onChange={(e) => {
                    const next = e.target.value;
                    setLocation(next);
                    setLocationSource(next.trim() ? 'manual' : geo ? 'gps' : 'none');
                  }}
                />
                <div className="flex items-center gap-2 mt-2">
                  {(locating || !geo || !location.trim()) ? (
                    <Button type="button" variant="outline" onClick={fetchCurrentLocation} disabled={locating}>
                      {locating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LocateFixedIcon className="h-4 w-4 mr-2" />}
                      {t('listings.form.useCurrentLocation')}
                    </Button>
                  ) : null}
                </div>
                {locationHint ? (
                  <p
                    className={
                      locationHintTone === 'warning'
                        ? 'text-xs text-amber-700'
                        : locationHintTone === 'success'
                          ? 'text-xs text-green-700'
                          : 'text-xs text-muted-foreground'
                    }
                  >
                    {locationHint}
                  </p>
                ) : null}
                {errors?.location && <p className="text-sm text-destructive">{errors.location.join(', ')}</p>}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-stretch p-6">
          <SubmitButton loading={creating} isEdit={Boolean(listingId)} />
          {message && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircleIcon className="h-5 w-5" />
              <AlertTitle>{t('listings.form.errorTitle')}</AlertTitle>
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>
    </form>
  );
}
