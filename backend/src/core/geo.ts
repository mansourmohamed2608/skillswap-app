import axios from 'axios';
import { logger } from './logger';

export type GeoPoint = { lat: number; lng: number };

export type GeocodeResult = {
  point: GeoPoint;
  formattedAddress?: string;
  placeId?: string;
  city?: string;
  country?: string;
  provider: 'google';
};

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

function readMapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || '';
}

function toFiniteNumber(value: any): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function readGeoPoint(value: any): GeoPoint | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const lat = toFiniteNumber((value as any).lat);
  const lng = toFiniteNumber((value as any).lng);
  if (lat === undefined || lng === undefined) return undefined;
  return { lat, lng };
}

function parseAddressParts(components: any[]) {
  const parts = Array.isArray(components) ? components : [];
  const byType = (type: string) =>
    parts.find((item: any) => Array.isArray(item?.types) && item.types.includes(type));

  const locality = byType('locality')?.long_name;
  const subLocality = byType('sublocality')?.long_name;
  const adminArea2 = byType('administrative_area_level_2')?.long_name;
  const country = byType('country')?.long_name;
  const city = locality || subLocality || adminArea2;

  return {
    city: city ? String(city) : undefined,
    country: country ? String(country) : undefined,
  };
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const text = String(query || '').trim();
  if (!text) return null;
  const apiKey = readMapsApiKey();
  if (!apiKey) return null;

  try {
    const resp = await axios.get(GOOGLE_GEOCODE_URL, {
      params: { address: text, key: apiKey },
      timeout: 3500,
    });
    const data: any = resp?.data || {};
    if (String(data.status || '').toUpperCase() !== 'OK' || !Array.isArray(data.results) || !data.results.length) {
      return null;
    }
    const top = data.results[0] || {};
    const lat = toFiniteNumber(top?.geometry?.location?.lat);
    const lng = toFiniteNumber(top?.geometry?.location?.lng);
    if (lat === undefined || lng === undefined) return null;
    const parsed = parseAddressParts(top?.address_components || []);
    return {
      point: { lat, lng },
      formattedAddress: top.formatted_address ? String(top.formatted_address) : undefined,
      placeId: top.place_id ? String(top.place_id) : undefined,
      city: parsed.city,
      country: parsed.country,
      provider: 'google',
    };
  } catch (err) {
    logger.warn({ err }, '[Geo] Geocoding failed');
    return null;
  }
}

export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * y;
}
