import { NextRequest, NextResponse } from 'next/server';

function backendBase() {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'skillswap-69yxi';
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION || 'europe-west3';
  if (process.env.NODE_ENV === 'development') {
    return `http://127.0.0.1:5001/${project}/us-central1`;
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || `https://${region}-${project}.cloudfunctions.net`;
}

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
    const url = new URL(`${backendBase()}/api/search/listings`);
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
