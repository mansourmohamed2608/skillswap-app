"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchKycStatus, verifyKycIdWithFiles } from '@/services/kyc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, Upload, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

export default function VerifyProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/signin');
  }, [user, loading, router]);

  useEffect(() => {
    async function load() {
      try {
        const s = await fetchKycStatus();
        setStatus(s.result || null);
      } catch {
        /* ignore */
      } finally {
        setLoadingStatus(false);
      }
    }
    if (user) load();
  }, [user]);

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
        title: 'File Too Large',
        description: 'File must be smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Only JPG, PNG, WEBP, or PDF files are allowed',
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
        title: 'Missing Files',
        description: 'Please upload both front and back of your ID',
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
          title: 'Verification Successful',
          description: 'Your identity has been verified!',
        });
      } else if (data.result?.status === 'FAILED') {
        toast({
          title: 'Verification Failed',
          description: data.result?.reason || 'Please check your documents and try again',
          variant: 'destructive',
        });
      } else if (data.result?.status === 'IN_REVIEW') {
        toast({
          title: 'Under Review',
          description: 'Your documents are being reviewed. This may take a few minutes.',
        });
      }
    } catch (err: any) {
      console.error('Verification failed', err);
      toast({
        title: 'Verification Error',
        description: err.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  if (loadingStatus) {
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
            <CardTitle className="text-2xl">Identity Verification</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {status && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 font-medium mb-2">
                {status.status === 'VERIFIED' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                {status.status === 'FAILED' && <XCircle className="h-5 w-5 text-rose-600" />}
                Current Status:{' '}
                <span className={`uppercase ${
                  status.status === 'VERIFIED' ? 'text-emerald-600' :
                  status.status === 'FAILED' ? 'text-rose-600' :
                  'text-amber-600'
                }`}>
                  {status.status}
                </span>
              </div>
              {status.reason && <div className="text-sm text-muted-foreground">{status.reason}</div>}
              {status.verifiedName && (
                <div className="text-sm text-muted-foreground">
                  Verified as: {status.verifiedName}
                </div>
              )}
              {status.documentNumber && (
                <div className="text-sm text-muted-foreground">
                  Document No.: {status.documentNumber}
                </div>
              )}
            </div>
          )}

          {(!status || status.status === 'FAILED') && (
            <>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Upload clear photos of the front and back of your Egypt National ID</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Ensure all text is clearly visible</li>
                  <li>Photos should be well-lit with no glare</li>
                  <li>Accepted formats: JPG, PNG, WEBP, PDF (max 5MB each)</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="front-upload" className="mb-2 block">
                    Front of ID *
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
                        <img src={frontPreview} alt="Front preview" className="w-full h-full object-contain" />
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
                    Back of ID *
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
                        <img src={backPreview} alt="Back preview" className="w-full h-full object-contain" />
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
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Submit for Verification
                  </>
                )}
              </Button>
            </>
          )}

          {status?.status === 'PENDING' && (
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Your verification is in progress. This may take a few minutes.</p>
            </div>
          )}

          {status?.status === 'IN_REVIEW' && (
            <div className="text-center space-y-3">
              <p className="text-amber-600">Your documents are being reviewed manually. This may take up to 24 hours.</p>
              <Button onClick={() => router.push('/profile')} variant="outline">
                Back to Profile
              </Button>
            </div>
          )}

          {status?.status === 'VERIFIED' && (
            <div className="text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto" />
              <p className="text-emerald-600 font-medium">Your identity has been verified!</p>
              <Button onClick={() => router.push('/profile')} variant="outline">
                Back to Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
