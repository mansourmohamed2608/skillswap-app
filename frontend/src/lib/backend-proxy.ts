import { NextRequest, NextResponse } from 'next/server';

export function backendBase() {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'skillswap-69yxi';
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION || 'europe-west3';
  if (process.env.NODE_ENV === 'development') {
    return `http://127.0.0.1:5001/${project}/us-central1`;
  }
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_FUNCTIONS_BASE ||
    `https://${region}-${project}.cloudfunctions.net`
  );
}

export async function proxyToBackend(request: NextRequest, apiPath: string) {
  const target = new URL(`${backendBase()}${apiPath}`);
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
