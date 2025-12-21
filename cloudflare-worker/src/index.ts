interface Env {
    VIDEO_BUCKET: R2Bucket;
    ALLOWED_ORIGIN: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // Default CORS Headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
            'Access-Control-Max-Age': '86400',
        };

        // Handle OPTIONS (Preflight)
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // 1. Generate Upload URL (POST /)
        if (request.method === 'POST' && url.pathname === '/') {
            try {
                const body = await request.json() as any;
                const filename = body.fileName || body.filename;
                const contentType = body.contentType;

                if (!filename || !contentType) {
                    return new Response('Missing fileName or contentType', {
                        status: 400,
                        headers: corsHeaders
                    });
                }

                const workerOrigin = url.origin;
                // Clean path construct
                const uploadPath = `/upload/${filename}`;
                const uploadUrl = `${workerOrigin}${uploadPath}`;

                return new Response(JSON.stringify({
                    uploadUrl: uploadUrl,
                    key: filename
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            } catch (e) {
                return new Response(`Error parsing request: ${e}`, {
                    status: 400,
                    headers: corsHeaders
                });
            }
        }

        // 4. Handle Delete (DELETE /<filename>)
        if (request.method === 'DELETE') {
            const objectKey = url.pathname.slice(1);

            if (!objectKey || objectKey === '') {
                return new Response('Missing filename', { status: 400, headers: corsHeaders });
            }

            try {
                await env.VIDEO_BUCKET.delete(objectKey);
                return new Response(JSON.stringify({ success: true, deleted: objectKey }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            } catch (e) {
                return new Response(`Delete Failed: ${e}`, { status: 500, headers: corsHeaders });
            }
        }
        if (request.method === 'PUT' && url.pathname.startsWith('/upload/')) {
            const objectKey = url.pathname.replace('/upload/', '');

            if (!objectKey) {
                return new Response('Missing filename', { status: 400, headers: corsHeaders });
            }

            try {
                await env.VIDEO_BUCKET.put(objectKey, request.body, {
                    httpMetadata: {
                        contentType: request.headers.get('Content-Type') || 'application/octet-stream',
                    }
                });

                return new Response(JSON.stringify({ success: true, key: objectKey }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            } catch (e) {
                return new Response(`R2 Upload Failed: ${e}`, {
                    status: 500,
                    headers: corsHeaders
                });
            }
        }

        // 3. Handle Video Streaming (GET /<filename>)
        // This catches "GET /videos/user/123_video.mp4" etc.
        if (request.method === 'GET') {
            // Strip leading slash to get the key
            const objectKey = url.pathname.slice(1);

            if (!objectKey || objectKey === '') {
                return new Response('Not found', { status: 404, headers: corsHeaders });
            }

            const range = request.headers.get('Range');

            try {
                const options: R2GetOptions = {
                    range: range ? parseRangeHeader(range) : undefined,
                    onlyIf: request.headers, // Supports ETag/If-Match/If-None-Match
                };

                const object = await env.VIDEO_BUCKET.get(objectKey, options);

                if (!object) {
                    return new Response('Video not found', { status: 404, headers: corsHeaders });
                }

                const headers = new Headers();
                object.writeHttpMetadata(headers);
                headers.set('etag', object.httpEtag);
                headers.set('Accept-Ranges', 'bytes');

                // Add CORS headers to the response headers
                Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

                // Aggressive Caching for Video Files
                // Videos are immutable by key, so we can cache for a long time
                headers.set('Cache-Control', 'public, max-age=31536000, immutable');

                // If range request was valid and satisfied
                if (options.range && 'range' in object && object.range) {
                    // Type guard for range with offset/length
                    const range = object.range as { offset: number; length: number };
                    if (typeof range.offset === 'number' && typeof range.length === 'number') {
                        headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`);
                        headers.set('Content-Length', range.length.toString());
                        return new Response(object.body, {
                            headers,
                            status: 206
                        });
                    }
                }

                // Full content
                headers.set('Content-Length', object.size.toString());
                return new Response(object.body, {
                    headers,
                    status: 200
                });

            } catch (e) {
                return new Response(`Streaming Error: ${e}`, { status: 500, headers: corsHeaders });
            }
        }

        // Default 404
        return new Response('Not found', {
            status: 404,
            headers: corsHeaders
        });
    },
};

// Helper: Parse Range Header
function parseRangeHeader(range: string): { offset?: number; length?: number; suffix?: number } | undefined {
    // Example: "bytes=0-1023" or "bytes=0-"
    const match = range.match(/^bytes=(\d+)-(\d+)?$/);
    if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : undefined;
        if (end !== undefined) {
            return { offset: start, length: end - start + 1 };
        }
        return { offset: start };
    }
    return undefined;
}
