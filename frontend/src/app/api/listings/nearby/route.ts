import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '5';

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Missing latitude or longitude' },
        { status: 400 }
      );
    }

    // Call backend search/listings endpoint with nearLat/nearLng & radius
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    const url = new URL(`${backendUrl}/api/search/listings`);
    url.searchParams.set('nearLat', String(lat));
    url.searchParams.set('nearLng', String(lng));
    url.searchParams.set('radiusKm', String(radius));
    url.searchParams.set('pageSize', '100');

    const response = await fetch(url.toString(), { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Backend nearby failed: ${response.statusText}`);
    }

    const data = await response.json();
    // backend returns `{ hits: [...] }` (or legacy shape). Normalize to array
    const hits = Array.isArray(data?.hits) ? data.hits : (Array.isArray(data) ? data : []);
    // Ensure distance field is present (backend may include `distanceKm`)
    const normalized = hits.map((h: any) => ({
      id: h.id || h._id || h.publicId || h.documentId,
      title: h.title || h.offeredService?.title || '',
      distance: h.distanceKm !== undefined ? Number(h.distanceKm) : (h.distance !== undefined ? Number(h.distance) : undefined),
      latitude: h.geo?.lat ?? h.latitude ?? (h.locationMeta?.lat || undefined),
      longitude: h.geo?.lng ?? h.longitude ?? (h.locationMeta?.lng || undefined),
      raw: h,
    })).filter(Boolean);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('Nearby listings API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby listings' },
      { status: 500 }
    );
  }
}

// Haversine formula for distance calculation
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
