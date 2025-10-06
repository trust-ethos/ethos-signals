import { validateAuthToken, checkRateLimit, type ExtensionAuthToken } from "./extension-auth.ts";

export interface AuthenticatedRequest extends Request {
  auth?: ExtensionAuthToken;
}

export interface AuthMiddlewareOptions {
  required?: boolean; // If true, reject unauthenticated requests
  rateLimitEndpoint?: string; // Endpoint identifier for rate limiting
  allowedOrigins?: string[]; // CORS allowed origins
}

/**
 * Middleware to authenticate requests using extension auth tokens
 */
export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<Response>,
  options: AuthMiddlewareOptions = {}
): Promise<(req: Request) => Promise<Response>> {
  const {
    required = false,
    rateLimitEndpoint = 'default',
    allowedOrigins = ['*'],
  } = options;

  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return createCorsResponse(null, allowedOrigins);
    }

    // Extract auth token from header
    const authHeader = req.headers.get('Authorization');
    const authToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;

    // Validate token if provided
    let auth: ExtensionAuthToken | null = null;
    if (authToken) {
      auth = await validateAuthToken(authToken);
      
      if (!auth) {
        return createCorsResponse(
          new Response(
            JSON.stringify({ 
              error: 'Invalid or expired authentication token',
              code: 'INVALID_TOKEN' 
            }),
            { status: 401, headers: { 'content-type': 'application/json' } }
          ),
          allowedOrigins
        );
      }

      // Check rate limit
      const rateLimit = await checkRateLimit(authToken, rateLimitEndpoint);
      
      if (!rateLimit.allowed) {
        const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
        return createCorsResponse(
          new Response(
            JSON.stringify({ 
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              resetAt: rateLimit.resetAt,
              limit: rateLimit.limit,
            }),
            { 
              status: 429, 
              headers: { 
                'content-type': 'application/json',
                'Retry-After': retryAfter.toString(),
                'X-RateLimit-Limit': rateLimit.limit.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
              } 
            }
          ),
          allowedOrigins
        );
      }
    } else if (required) {
      // No token provided but auth is required
      return createCorsResponse(
        new Response(
          JSON.stringify({ 
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
            message: 'This endpoint requires authentication. Please connect your wallet in the extension.'
          }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        ),
        allowedOrigins
      );
    }

    // Attach auth to request
    const authenticatedReq = req as AuthenticatedRequest;
    if (auth) {
      authenticatedReq.auth = auth;
    }

    // Call the handler
    try {
      const response = await handler(authenticatedReq);
      return createCorsResponse(response, allowedOrigins);
    } catch (error) {
      console.error('Handler error:', error);
      return createCorsResponse(
        new Response(
          JSON.stringify({ 
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
          }),
          { status: 500, headers: { 'content-type': 'application/json' } }
        ),
        allowedOrigins
      );
    }
  };
}

/**
 * Helper to add CORS headers to response
 */
function createCorsResponse(response: Response | null, allowedOrigins: string[]): Response {
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes('*') ? '*' : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Ethos-Client',
    'Access-Control-Max-Age': '86400',
  };

  if (!response) {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  // Clone response and add CORS headers
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Check if request has valid authentication (for conditional logic)
 */
export async function isAuthenticated(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  const authToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null;

  if (!authToken) return false;

  const auth = await validateAuthToken(authToken);
  return auth !== null;
}

/**
 * Get auth info from request (if available)
 */
export async function getAuthFromRequest(req: Request): Promise<ExtensionAuthToken | null> {
  const authHeader = req.headers.get('Authorization');
  const authToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null;

  if (!authToken) return null;

  return await validateAuthToken(authToken);
}

