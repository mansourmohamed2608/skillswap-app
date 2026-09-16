import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

async function proxy(request: NextRequest, segments: string[]) {
  const suffix = segments.length ? `/${segments.map(encodeURIComponent).join('/')}` : '';
  return proxyToBackend(request, `/api/kyc${suffix}`);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxy(request, path);
}
