// src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { DocumentData, doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { addModerationKeyword, dismissFlaggedContent, fetchAdminAnalytics, fetchAdminAudit, fetchAdminReports, fetchAdminUsers, fetchFlaggedContent, fetchModerationKeywords, removeFlaggedContent, removeModerationKeyword, resolveAdminReport, updateAdminUserRole, updateAdminUserStatus } from '@/services/api';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [flagged, setFlagged] = useState<Array<{ id: string; type: 'listing' | 'wish' | 'review'; data: DocumentData }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; email?: string; name?: string; role?: string; accountStatus?: string }>>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [auditItems, setAuditItems] = useState<Array<{ id: string; actorId: string; action: string; targetId: string; details?: any; createdAt?: any }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [reports, setReports] = useState<Array<{ id: string; type: string; contentId: string; reason: string; note?: string; reporterId: string; ownerId?: string; status: string; createdAt?: any }>>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [analyticsSummary, setAnalyticsSummary] = useState<Array<{ name: string; count: number }>>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analyticsItems, setAnalyticsItems] = useState<Array<{ id: string; name: string; userId?: string; properties?: any; createdAt?: any }>>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    (async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        // Check if user has admin role
        if (isFirebaseConfigured()) {
          const userDoc = await getDoc(doc(db!, 'users', user.uid));
          const userData = userDoc.data();
          const hasAdminRole = userData?.role === 'admin';
          setIsAdmin(hasAdminRole);

          if (hasAdminRole) {
            const res = await fetchFlaggedContent();
            setFlagged(res.items || []);
            try {
              const keywordRes = await fetchModerationKeywords();
              setKeywords(keywordRes.keywords || []);
            } catch {
              // failed to load keywords; section stays empty
            }
            try {
              setUsersLoading(true);
              const usersRes = await fetchAdminUsers(50);
              setUsers(usersRes.users || []);
            } catch {
              // failed to load users; section stays empty
            } finally {
              setUsersLoading(false);
            }
            try {
              setAuditLoading(true);
              const auditRes = await fetchAdminAudit(50);
              setAuditItems(auditRes.items || []);
            } catch {
              // failed to load audit log; section stays empty
            } finally {
              setAuditLoading(false);
            }
            try {
              setAnalyticsLoading(true);
              const analyticsRes = await fetchAdminAnalytics(200);
              setAnalyticsSummary(analyticsRes.summary || []);
              setAnalyticsItems(analyticsRes.items || []);
            } catch {
              // failed to load analytics; section stays empty
            } finally {
              setAnalyticsLoading(false);
            }
            try {
              setReportsLoading(true);
              const reportRes = await fetchAdminReports(50);
              setReports(reportRes.items || []);
            } catch {
              // failed to load reports; section stays empty
            } finally {
              setReportsLoading(false);
            }
          }
        }
      } catch {
        // admin data load failed; page will show empty sections
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('admin.signInRequired')}
          </AlertDescription>
        </Alert>
        <Link href="/auth/signin">
          <Button>{t('admin.signIn')}</Button>
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('admin.accessDenied')}
          </AlertDescription>
        </Alert>
        <Link href="/">
          <Button variant="outline">{t('admin.goHome')}</Button>
        </Link>
      </div>
    );
  }

  const handleAddKeyword = async () => {
    const value = keywordInput.trim();
    if (!value) return;
    setKeywordsLoading(true);
    try {
      const res = await addModerationKeyword(value);
      setKeywords(res.keywords || []);
      setKeywordInput('');
    } catch {
      // keyword add failed silently
    } finally {
      setKeywordsLoading(false);
    }
  };

  const handleRemoveKeyword = async (keyword: string) => {
    setKeywordsLoading(true);
    try {
      const res = await removeModerationKeyword(keyword);
      setKeywords(res.keywords || []);
    } catch {
      // keyword remove failed silently
    } finally {
      setKeywordsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'moderator' | 'user') => {
    try {
      await updateAdminUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch {
      // role update failed silently
    }
  };

  const handleStatusChange = async (userId: string, status: 'active' | 'suspended' | 'banned') => {
    try {
      await updateAdminUserStatus(userId, status);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, accountStatus: status } : u)));
    } catch {
      // status update failed silently
    }
  };

  const handleResolveReport = async (reportId: string, action: 'dismiss' | 'remove') => {
    try {
      await resolveAdminReport(reportId, action);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch {
      // report resolve failed silently
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-primary">{t('admin.title')}</h1>
      <section>
        <h2 className="text-2xl font-semibold mb-4">{t('admin.keywordsTitle')}</h2>
        <Card className="shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder={t('admin.keywordPlaceholder')}
              />
              <Button
                onClick={handleAddKeyword}
                disabled={keywordsLoading || !keywordInput.trim()}
                className="sm:w-40"
              >
                {t('admin.addKeyword')}
              </Button>
            </div>
            {keywords.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.keywordsEmpty')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <div
                    key={keyword}
                    className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"
                  >
                    <span>{keyword}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`${t('admin.removeKeyword')} ${keyword}`}
                      disabled={keywordsLoading}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4">{t('admin.usersTitle')}</h2>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            {usersLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('admin.loadingUsers')}
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.usersEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="flex flex-col gap-2 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{u.name || u.email || u.id}</p>
                      <p className="text-xs text-muted-foreground">{u.email || u.id}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{t('admin.roleLabel')}: {u.role || 'user'}</Badge>
                        <Badge variant="secondary">{t('admin.statusLabel')}: {u.accountStatus || 'active'}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRoleChange(u.id, 'admin')}>
                        {t('admin.makeAdmin')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRoleChange(u.id, 'user')}>
                        {t('admin.makeUser')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(u.id, 'suspended')}>
                        {t('admin.suspend')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(u.id, 'active')}>
                        {t('admin.activate')}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusChange(u.id, 'banned')}>
                        {t('admin.ban')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4">{t('admin.reportsTitle')}</h2>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            {reportsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('admin.loadingReports')}
              </div>
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.reportsEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="destructive">{report.type}</Badge>
                      <span className="font-mono text-xs">{report.contentId}</span>
                      <span className="text-muted-foreground">{t('admin.reportedBy')}</span>
                      <span className="font-mono text-xs">{report.reporterId}</span>
                    </div>
                    <p className="text-sm">{report.reason}</p>
                    {report.note ? (
                      <p className="text-xs text-muted-foreground">{report.note}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleResolveReport(report.id, 'dismiss')}>
                        {t('admin.dismissReport')}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleResolveReport(report.id, 'remove')}>
                        {t('admin.removeReported')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4">{t('admin.auditTitle')}</h2>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            {auditLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('admin.loadingAudit')}
              </div>
            ) : auditItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.auditEmpty')}</p>
            ) : (
              <div className="space-y-2 text-sm">
                {auditItems.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                    <div>
                      <span className="font-semibold">{item.action}</span>{' '}
                      <span className="text-muted-foreground">{t('admin.auditOn')}</span>{' '}
                      <span className="font-mono text-xs">{item.targetId}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4">{t('admin.analyticsTitle')}</h2>
        <Card className="shadow-sm">
          <CardContent className="pt-6 space-y-4">
            {analyticsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('admin.loadingAnalytics')}
              </div>
            ) : analyticsSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.analyticsEmpty')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {analyticsSummary.map((item) => (
                  <span key={item.name} className="rounded-full border border-border px-3 py-1 text-sm">
                    {item.name} · {item.count}
                  </span>
                ))}
              </div>
            )}
            {analyticsItems.length > 0 && (
              <div className="space-y-2 text-sm">
                {analyticsItems.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{item.name}</span>
                      {item.userId ? <span className="text-muted-foreground">· {item.userId}</span> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4">{t('admin.flaggedTitle')}</h2>
        {flagged.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flagged.map(({ id, type, data }) => {
              const title =
                data.title ||
                data.offeredService?.title ||
                (type === 'review' ? (String(data.comment || '').slice(0, 60) || t('admin.reviewFallback')) : t('listings.card.untitled'));
              const reason = data.flagReason || data.reason || t('admin.reasonFallback');
              const link =
                type === 'listing'
                  ? `/listings/${id}`
                  : type === 'wish'
                    ? `/wishes/${id}`
                    : data.listingId
                      ? `/listings/${data.listingId}`
                      : '';
              return (
              <Card key={id} className="shadow-md">
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                  <Badge variant="destructive">{t('admin.flaggedBadge')}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-2">{t('admin.reasonLabel')} {reason}</p>
                  {link ? (
                    <Link href={link} className="text-accent hover:underline text-sm">{t('admin.viewListing')}</Link>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await dismissFlaggedContent(type, id);
                          setFlagged((prev) => prev.filter((item) => item.id !== id));
                        } catch {
                          // dismiss failed silently
                        }
                      }}
                    >
                      {t('admin.dismissFlag')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await removeFlaggedContent(type, id);
                          setFlagged((prev) => prev.filter((item) => item.id !== id));
                        } catch {
                          // remove failed silently
                        }
                      }}
                    >
                      {t('admin.removeContent')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">{t('admin.empty')}</p>
        )}
      </section>
    </div>
  );
}
