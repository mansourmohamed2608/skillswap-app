import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export function GET(request: NextRequest) {
  return proxyToBackend(request, '/api/categories');
}
