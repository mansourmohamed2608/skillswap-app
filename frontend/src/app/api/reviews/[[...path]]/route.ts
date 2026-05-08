import { NextRequest, NextResponse } from 'next/server';

function backendBase() {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION || 'europe-west3';
  if (process.env.NODE_ENV === 'development') {
    return `http://127.0.0.1:5001/${project || 'skillswap-69yxi'}/us-central1`;
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || `https://${region}-${project || 'skillswap-69yxi'}.cloudfunctions.net`;
}

async function proxy(request: NextRequest, segments: string[]) {
  const suffix = segments.length ? `/${segments.map(encodeURIComponent).join('/')}` : '';
  const target = new URL(`${backendBase()}/api/reviews${suffix}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const response = await fetch(target.toString(), init);
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json',
    },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxy(request, path);
}