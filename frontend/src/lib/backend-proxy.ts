import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_PROJECT = 'skillswap-69yxi';
const DEFAULT_REGION = 'europe-west3';
const FUNCTION_NAME = 'api';

/**
 * Root URL for the deployed Firebase HTTPS function (includes the function name).
 * NestJS mounts routes under `/api/*`, so requests must target:
 * `{functionBase}/api/matchmaking/cycles3` → Express receives `/api/matchmaking/cycles3`.
 */
export function resolveBackendFunctionBase(): string {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_PROJECT;
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION || DEFAULT_REGION;

  if (process.env.NODE_ENV === 'development') {
    return `http://127.0.0.1:5001/${project}/${region}/${FUNCTION_NAME}`;
  }

  const configured =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_FUNCTIONS_BASE ||
    `https://${region}-${project}.cloudfunctions.net`;

  const root = configured.replace(/\/+$/, '');
  if (root.endsWith(`/${FUNCTION_NAME}`)) return root;
  return `${root}/${FUNCTION_NAME}`;
}

/** Build the upstream Cloud Function URL for a Nest `/api/...` route. */
export function buildBackendApiUrl(apiPath: string): string {
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  return `${resolveBackendFunctionBase()}${path}`;
}

export function backendBase() {
  return resolveBackendFunctionBase();
}

export async function proxyToBackend(request: NextRequest, apiPath: string) {
  const target = new URL(buildBackendApiUrl(apiPath));
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
    // Preserve multipart uploads (KYC images) as bytes; this also safely
    // forwards JSON and form-encoded request bodies without re-serializing.
    init.body = await request.arrayBuffer();
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
