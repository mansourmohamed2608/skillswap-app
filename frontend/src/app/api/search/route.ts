import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const lang = searchParams.get('lang') || 'en';

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query too short' },
        { status: 400 }
      );
    }

    // Call backend search/listings endpoint via GET
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    const url = new URL(`${backendUrl}/api/search/listings`);
    url.searchParams.set('q', query);
    url.searchParams.set('lang', lang);
    url.searchParams.set('page', '0');
    url.searchParams.set('pageSize', '50');

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) throw new Error(`Backend search failed: ${response.statusText}`);
    const results = await response.json();

    // Normalize backend `hits` → listings
    const listings = Array.isArray(results?.hits) ? results.hits : (Array.isArray(results) ? results : []);

    return NextResponse.json({
      listings,
      wishes: [],
      services: [],
      categories: [],
      locations: [],
      users: [],
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
