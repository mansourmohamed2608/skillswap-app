
'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import Image from 'next/image';
import { serviceCategories } from '@/services/serviceCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PlusCircleIcon, AlertCircleIcon, RepeatIcon, UploadCloudIcon } from 'lucide-react';
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
import { findBannedKeywordInFields } from '@/lib/moderation';

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
  const { t } = useTranslation();
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
  const [location, setLocation] = useState('');
  const [offeredFile, setOfferedFile] = useState<File | null>(null);
  const isBusiness = membership?.plan === 'Business' && active;

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
  }, [isBusiness, user?.uid]);

  const categoryOptions = useMemo(() => {
    const extras = [
      initialListing?.offeredService?.category,
      initialListing?.requestedService?.category,
      ...customCategories,
    ].map((item) => String(item || '').trim()).filter(Boolean);
    const combined = [...serviceCategories, ...extras];
    return Array.from(new Set(combined));
  }, [customCategories, initialListing?.offeredService?.category, initialListing?.requestedService?.category]);

  useEffect(() => {
    if (!initialListing) return;
    setOfferedServiceTitle(initialListing.offeredService?.title || '');
    setOfferedServiceCategory(initialListing.offeredService?.category || undefined);
    setOfferedServiceDescription(initialListing.offeredService?.description || '');
    setRequestedServiceTitle(initialListing.requestedService?.title || '');
    setRequestedServiceCategory(initialListing.requestedService?.category || undefined);
    setRequestedServiceDescription(initialListing.requestedService?.description || '');
    setLocation(initialListing.location || '');
    setExistingImageUrl(initialListing.offeredService?.imageUrl || undefined);
    setImagePreview(initialListing.offeredService?.imageUrl || null);
  }, [initialListing]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOfferedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(existingImageUrl || null);
      setOfferedFile(null);
    }
  };
  
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
    const banned = findBannedKeywordInFields([
      { label: 'offeredService.title', value: offeredServiceTitle },
      { label: 'offeredService.description', value: offeredServiceDescription },
      { label: 'offeredService.category', value: offeredServiceCategory },
      { label: 'requestedService.title', value: requestedServiceTitle },
      { label: 'requestedService.description', value: requestedServiceDescription },
      { label: 'requestedService.category', value: requestedServiceCategory },
      { label: 'location', value: location },
    ]);
    if (banned) {
      setMessage(t('errors.codes.content/banned'));
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

      // Build the nested listing structure expected by the UI and data layer
      const listing = {
        offeredService: {
          title: offeredServiceTitle,
          category: offeredServiceCategory!,
          description: offeredServiceDescription,
          imageUrl,
        },
        requestedService: {
          title: requestedServiceTitle,
          category: requestedServiceCategory!,
          description: requestedServiceDescription,
        },
        location,
        status: 'open' as const,
        postedDate: new Date().toISOString(),
      };
      if (listingId) {
        await updateListing(listingId, listing);
        toast({ title: t('listings.form.updatedTitle'), description: t('listings.form.updatedDescription') });
        router.push(`/listings/${listingId}`);
      } else {
        // Call backend endpoint which enforces membership and bypasses Firestore rules
        await createListing(listing);
        toast({ title: t('listings.form.successTitle'), description: t('listings.form.successDescription') });
        // Reset form
        setOfferedServiceTitle('');
        setOfferedServiceCategory(undefined);
        setOfferedServiceDescription('');
        setRequestedServiceTitle('');
        setRequestedServiceCategory(undefined);
        setRequestedServiceDescription('');
        setLocation('');
        setOfferedFile(null);
        setImagePreview(null);
        setExistingImageUrl(undefined);
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        router.push('/pricing?alert=sub-required');
        return;
      }
      setMessage(getErrorMessage(err, t('listings.form.errorGeneric')));
    } finally {
      setCreating(false);
    }
  }


  return (
    <form onSubmit={onSubmit}>
      <Card className="shadow-xl">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 items-start">
          {/* Offered Service Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary border-b pb-2">{t('listings.form.offerSection')}</h3>
            <div className="space-y-1">
              <Label htmlFor="offeredServiceTitle">{t('listings.form.titleLabel')}</Label>
              <Input id="offeredServiceTitle" placeholder={t('listings.form.offerTitlePlaceholder')} required value={offeredServiceTitle} onChange={(e)=>setOfferedServiceTitle(e.target.value)} />
              {errors?.offeredServiceTitle && <p className="text-sm text-destructive">{errors.offeredServiceTitle.join(', ')}</p>}
            </div>
             <div className="space-y-1">
              <Label htmlFor="offeredServiceCategory">{t('listings.form.categoryLabel')}</Label>
                <Select value={offeredServiceCategory} onValueChange={setOfferedServiceCategory} required>
                  <SelectTrigger><SelectValue placeholder={t('listings.form.categoryPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(category => (
                      <SelectItem key={`offered-${category}`} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
               {errors?.offeredServiceCategory && <p className="text-sm text-destructive">{errors.offeredServiceCategory.join(', ')}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="offeredServiceDescription">{t('listings.form.descriptionLabel')}</Label>
              <Textarea id="offeredServiceDescription" placeholder={t('listings.form.offerDescriptionPlaceholder')} rows={4} required value={offeredServiceDescription} onChange={(e)=>setOfferedServiceDescription(e.target.value)} />
              {errors?.offeredServiceDescription && <p className="text-sm text-destructive">{errors.offeredServiceDescription.join(', ')}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="offeredServiceImage">{t('listings.form.imageLabel')}</Label>
                <div className="flex items-center gap-4">
                    <Input id="offeredServiceImage" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} className="w-full" />
                    {imagePreview ? (
                        <Image src={imagePreview} alt={t('listings.form.imageAlt')} width={80} height={80} className="rounded-md object-cover" data-ai-hint="service photo"/>
                    ) : (
                        <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                            <UploadCloudIcon className="h-8 w-8"/>
                        </div>
                    )}
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
              <Label htmlFor="requestedServiceTitle">{t('listings.form.titleLabel')}</Label>
              <Input id="requestedServiceTitle" placeholder={t('listings.form.requestTitlePlaceholder')} required value={requestedServiceTitle} onChange={(e)=>setRequestedServiceTitle(e.target.value)} />
              {errors?.requestedServiceTitle && <p className="text-sm text-destructive">{errors.requestedServiceTitle.join(', ')}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="requestedServiceCategory">{t('listings.form.categoryLabel')}</Label>
               <Select value={requestedServiceCategory} onValueChange={setRequestedServiceCategory} required>
                  <SelectTrigger><SelectValue placeholder={t('listings.form.categoryPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(category => (
                      <SelectItem key={`requested-${category}`} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
               {errors?.requestedServiceCategory && <p className="text-sm text-destructive">{errors.requestedServiceCategory.join(', ')}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="requestedServiceDescription">{t('listings.form.descriptionLabel')}</Label>
              <Textarea id="requestedServiceDescription" placeholder={t('listings.form.requestDescriptionPlaceholder')} rows={4} required value={requestedServiceDescription} onChange={(e)=>setRequestedServiceDescription(e.target.value)} />
              {errors?.requestedServiceDescription && <p className="text-sm text-destructive">{errors.requestedServiceDescription.join(', ')}</p>}
            </div>
             <div className="space-y-1 !mt-12">
                <Label htmlFor="location">{t('listings.form.locationLabel')}</Label>
                <Input id="location" placeholder={t('listings.form.locationPlaceholder')} required value={location} onChange={(e)=>setLocation(e.target.value)} />
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
