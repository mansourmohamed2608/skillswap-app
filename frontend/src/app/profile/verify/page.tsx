"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchKycStatus, verifyKycIdWithFiles } from '@/services/kyc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, Upload, CheckCircle, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { auth } from '@/services/firebase';
import { isAuthContextSyncing, shouldRedirectToSignIn } from '@/lib/auth-routing';
import { safeReturnPath } from '@/lib/safe-return-path';


export default function VerifyProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const intendedDestination = safeReturnPath(searchParams.get('next'), '/profile');
  const { t } = useTranslation();
  const { toast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusReloadKey, setStatusReloadKey] = useState(0);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);


  const statusCode = String(status?.status || '').trim().toUpperCase();
  const statusLabel = statusCode
    ? t(`profile.verify.status.${statusCode.toLowerCase()}`, { defaultValue: statusCode })
    : '';

  useEffect(() => {
    if (shouldRedirectToSignIn(loading, user?.uid, auth?.currentUser?.uid)) router.push('/auth/signin');
  }, [user, loading, router]);

  useEffect(() => {
    try { localStorage.setItem('kyc:returnTo', intendedDestination); } catch {}
  }, [intendedDestination]);

  useEffect(() => {
    if (statusCode !== 'VERIFIED') return;
    const timer = window.setTimeout(() => router.replace(intendedDestination), 500);
    return () => window.clearTimeout(timer);
  }, [intendedDestination, router, statusCode]);

  useEffect(() => {
    async function load() {
      setLoadingStatus(true);
      setStatusError(null);
      try {
        const s = await fetchKycStatus();
        setStatus(s.result || null);
      } catch (error) {
        setStatusError(getErrorMessage(error, t('profile.verify.errorBody')));
      } finally {
        setLoadingStatus(false);
      }
    }
    if (user) load();
  }, [statusReloadKey, t, user]);



  const handleFileChange = (file: File | null, type: 'front' | 'back') => {
    if (!file) {
      if (type === 'front') {
        setFrontFile(null);
        setFrontPreview(null);
      } else {
        setBackFile(null);
        setBackPreview(null);
      }
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('profile.verify.fileTooLargeTitle'),
        description: t('profile.verify.fileTooLargeBody'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: t('profile.verify.invalidFileTypeTitle'),
        description: t('profile.verify.invalidFileTypeBody'),
        variant: 'destructive',
      });
      return;
    }

    if (type === 'front') {
      setFrontFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setFrontPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFrontPreview(null);
      }
    } else {
      setBackFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setBackPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setBackPreview(null);
      }
    }
  };

  async function submitVerification() {
    if (!user || !frontFile || !backFile) {
      toast({
        title: t('profile.verify.missingFilesTitle'),
        description: t('profile.verify.missingFilesBody'),
        variant: 'destructive',
      });
      return;
    }

    setBusy(true);
    try {
      const data = await verifyKycIdWithFiles(frontFile, backFile);
      setStatus(data.result);

      if (data.result?.status === 'VERIFIED') {
        toast({
          title: t('profile.verify.successTitle'),
          description: t('profile.verify.successBody'),
        });
      } else if (data.result?.status === 'FAILED') {
        toast({
          title: t('profile.verify.failedTitle'),
          description: data.result?.reason || t('profile.verify.failedBody'),
          variant: 'destructive',
        });
      } else if (data.result?.status === 'IN_REVIEW') {
        toast({
          title: t('profile.verify.inReviewTitle'),
          description: t('profile.verify.inReviewBody'),
        });
      }
    } catch (err: any) {
      toast({
        title: t('profile.verify.errorTitle'),
        description: err.message || t('profile.verify.errorBody'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  if (loadingStatus || isAuthContextSyncing(loading, user?.uid, auth?.currentUser?.uid)) {
    return (
      <div className="max-w-2xl mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <CardTitle className="text-2xl">{t('profile.verify.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {statusError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <p>{statusError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setStatusReloadKey((value) => value + 1)}
              >
                {t('common.retry', { defaultValue: 'Retry' })}
              </Button>
            </div>
          )}
          {status && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 font-medium mb-2">
                {statusCode === 'VERIFIED' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                {['FAILED', 'CANCELLED', 'DECLINED'].includes(statusCode) && <XCircle className="h-5 w-5 text-rose-600" />}
                {t('profile.verify.currentStatus')}{' '}
                <span className={`uppercase ${
                  statusCode === 'VERIFIED' ? 'text-emerald-600' :
                  ['FAILED', 'CANCELLED', 'DECLINED'].includes(statusCode) ? 'text-rose-600' :
                  'text-amber-600'
                }`}>
                  {statusLabel}
                </span>
              </div>
              {status.reason && <div className="text-sm text-muted-foreground">{status.reason}</div>}
              {status.verifiedName && (
                <div className="text-sm text-muted-foreground">
                  {t('profile.verify.verifiedAs', { name: status.verifiedName })}
                </div>
              )}
            </div>
          )}

          {(!status || ['FAILED', 'CANCELLED', 'DECLINED'].includes(statusCode)) && (
            <>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>{t('profile.verify.uploadHint')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('profile.verify.uploadRule1')}</li>
                  <li>{t('profile.verify.uploadRule2')}</li>
                  <li>{t('profile.verify.uploadRule3')}</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="front-upload" className="mb-2 block">
                    {t('profile.verify.uploadFront')}
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="front-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'front')}
                      disabled={busy}
                    />
                    {frontPreview && (
                      <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={frontPreview} alt={t('profile.verify.frontPreviewAlt')} className="w-full h-full object-contain" />
                      </div>
                    )}
                    {frontFile && !frontPreview && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="h-4 w-4" />
                        {frontFile.name}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="back-upload" className="mb-2 block">
                    {t('profile.verify.uploadBack')}
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="back-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'back')}
                      disabled={busy}
                    />
                    {backPreview && (
                      <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={backPreview} alt={t('profile.verify.backPreviewAlt')} className="w-full h-full object-contain" />
                      </div>
                    )}
                    {backFile && !backPreview && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="h-4 w-4" />
                        {backFile.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={submitVerification}
                disabled={busy || !frontFile || !backFile || !user}
                className="w-full"
                size="lg"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('profile.verify.submitting')}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {t('profile.verify.submit')}
                  </>
                )}
              </Button>
            </>
          )}

          {statusCode === 'PENDING' && (
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">{t('profile.verify.pendingBody')}</p>
            </div>
          )}

          {statusCode === 'IN_REVIEW' && (
            <div className="text-center space-y-3">
              <p className="text-amber-600">{t('profile.verify.inReviewLongBody')}</p>
              <Button onClick={() => router.push(intendedDestination)} variant="outline">
                {t('profile.verify.backToProfile')}
              </Button>
            </div>
          )}

          {statusCode === 'VERIFIED' && (
            <div className="text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto" />
              <p className="text-emerald-600 font-medium">{t('profile.verify.verifiedBody')}</p>
              <Button onClick={() => router.push('/profile')} variant="outline">
                {t('profile.verify.backToProfile')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
