import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

async function proxyMatchmaking(request: NextRequest, segments: string[]) {
  const suffix = segments.length ? `/${segments.map(encodeURIComponent).join('/')}` : '';
  return proxyToBackend(request, `/api/matchmaking${suffix}`);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyMatchmaking(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyMatchmaking(request, path);
}
