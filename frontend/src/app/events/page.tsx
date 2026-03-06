"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { registerForEvent, getFunctionsBase, recordAnalyticsEvent } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/errors";

type EventItem = {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  startsAt?: any;
  endsAt?: any;
  capacity?: number;
  registrationsCount?: number;
  coverUrl?: string | null;
};

export default function EventsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { membership, active } = useMembership();
  const { toast } = useToast();
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const fnBase = getFunctionsBase();
        const base = fnBase ? `${fnBase}/api` : (process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE_URL || '');
        if (!base) { setItems([]); setLoading(false); return; }
        const resp = await fetch(`${base}/events`, { cache: "no-store" });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canCreate = membership?.plan === "Business" && active;

  const formatDate = (raw: any) => {
    if (!raw) return "";
    try {
      const date = raw?.toDate ? raw.toDate() : new Date(raw);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-primary">{t("events.title")}</h1>
          <p className="text-muted-foreground">{t("events.subtitle")}</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/events/new">{t("events.createCta")}</Link>
          </Button>
        )}
      </header>

      {loading ? (
        <p className="text-muted-foreground">{t("events.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">{t("events.empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map((event) => {
            const capacity = Number(event.capacity || 0);
            const count = Number(event.registrationsCount || 0);
            const isFull = capacity > 0 && count >= capacity;
            return (
              <Card key={event.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle>{event.title || t("events.untitled")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {event.description ? <p>{event.description}</p> : null}
                  {event.location ? <p>{t("events.locationLabel")} {event.location}</p> : null}
                  {event.startsAt ? <p>{t("events.startsLabel")} {formatDate(event.startsAt)}</p> : null}
                  {capacity ? (
                    <p>{t("events.capacityLabel", { count, capacity })}</p>
                  ) : null}
                  <div className="pt-2">
                    {user ? (
                      <Button
                        variant="outline"
                        disabled={isFull}
                        onClick={async () => {
                          try {
                            const res = await registerForEvent(event.id);
                            if (!res.alreadyRegistered) recordAnalyticsEvent('event_registered', { eventId: event.id });
                            const msgKey = res.alreadyRegistered ? "events.alreadyRegistered" : "events.registered";
                            toast({ title: t(msgKey) });
                          } catch (e: any) {
                            toast({ title: t("events.registerFailed"), description: getErrorMessage(e, t("events.registerFailed")), variant: "destructive" });
                          }
                        }}
                      >
                        {isFull ? t("events.full") : t("events.registerCta")}
                      </Button>
                    ) : (
                      <Button asChild variant="outline">
                        <Link href="/auth/signin">{t("events.signInToRegister")}</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
