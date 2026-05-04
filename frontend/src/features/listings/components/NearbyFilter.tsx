'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { MapPin, Navigation } from 'lucide-react';

interface NearbyFilterProps {
  // onFiltered returns both the listings and the device coordinates used for the search
  onFiltered?: (payload: { listings: any[]; origin: { lat: number; lng: number } | null }) => void;
}

export default function NearbyFilter({ onFiltered }: NearbyFilterProps) {
  const { t } = useTranslation();
  const [radius, setRadius] = useState(5); // km
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const requestLocation = async () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError(t('listings.nearby.geolocation_not_supported'));
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        try {
          const response = await fetch(
            `/api/listings/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`
          );

          if (response.ok) {
            const data = await response.json();
            setResults(data);
            onFiltered?.({ listings: data, origin: { lat: latitude, lng: longitude } });
          } else {
            setError(t('listings.nearby.failed_to_fetch_nearby'));
          }
        } catch (err) {
          setError(t('listings.nearby.error_fetching_nearby'));
          console.error(err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(
          err.code === 1
            ? t('listings.nearby.location_permission_denied')
            : t('listings.nearby.location_error')
        );
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleRadiusChange = async (newRadius: number[]) => {
    setRadius(newRadius[0]);

    if (userLocation) {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/listings/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${newRadius[0]}`
        );

        if (response.ok) {
              const data = await response.json();
              setResults(data);
              onFiltered?.({ listings: data, origin: { lat: userLocation.lat, lng: userLocation.lng } });
        }
      } catch (err) {
        console.error('Failed to update nearby listings:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5" />
        <h3 className="text-lg font-semibold">
          Find nearby listings
        </h3>
      </div>

      {/* Location Request */}
      {!userLocation && (
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            {t('listings.nearby.enable_location_description')}
          </p>
          <Button
            onClick={requestLocation}
            disabled={loading}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Navigation className="w-4 h-4" />
            {loading ? t('common.detecting', 'Detecting...') : t('listings.nearby.enable_location')}
          </Button>
          {error && (
            <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Radius Slider */}
      {userLocation && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              {t('listings.nearby.search_radius')}: {radius} km
            </label>
            <Slider
              value={[radius]}
              onValueChange={handleRadiusChange}
              min={1}
              max={50}
              step={1}
              className="mt-2"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {t('listings.nearby.found_listings', { count: results.length })}
          </p>

          {results.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((listing) => (
                <a
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="block p-3 bg-muted hover:bg-muted/70 rounded-lg transition-colors"
                >
                  <p className="font-medium text-sm">{listing.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {listing.distance?.toFixed(1)} km away
                  </p>
                </a>
              ))}
            </div>
          )}

          <Button
            onClick={() => {
              setUserLocation(null);
              setResults([]);
            }}
            variant="outline"
            className="w-full"
          >
            {t('common.clear', 'Clear')}
          </Button>
        </div>
      )}
    </Card>
  );
}
