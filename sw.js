/**
 * Churchville Dental Care — Service Worker
 * Strategy:
 *   - HTML pages:      Network-first (always fresh content)
 *   - CSS / JS:        Cache-first with network fallback (versioned assets)
 *   - Images / fonts:  Stale-while-revalidate (fast loads, background refresh)
 *   - Third-party:     Network-only (never cache analytics / booking widgets)
 */

const CACHE_VERSION  = 'cdc-v1';
const STATIC_CACHE   = `${CACHE_VERSION}-static`;
const IMAGE_CACHE    = `${CACHE_VERSION}-images`;
const PAGE_CACHE     = `${CACHE_VERSION}-pages`;
const MAX_IMAGE_AGE  = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const MAX_IMAGE_ENTRIES = 60;

// Assets to pre-cache on install (critical path resources)
const PRE_CACHE_ASSETS = [
    '/',
    '/offline/',
    '/css/critical.css',
];

// Third-party origins to bypass (never cache)
const BYPASS_ORIGINS = [
    'www.google-analytics.com',
    'www.googletagmanager.com',
    'connect.facebook.net',
    'widget.zocdoc.com',
    'fonts.googleapis.com', // let the browser handle its own font cache
];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener( 'install', event => {
    event.waitUntil(
        caches.open( STATIC_CACHE )
            .then( cache => cache.addAll( PRE_CACHE_ASSETS ) )
            .then( () => self.skipWaiting() )
    );
} );

// ─── Activate — purge old caches ─────────────────────────────────────────────
self.addEventListener( 'activate', event => {
    event.waitUntil(
        caches.keys().then( keys =>
            Promise.all(
                keys
                    .filter( key => ! key.startsWith( CACHE_VERSION ) )
                    .map( key => caches.delete( key ) )
            )
        ).then( () => self.clients.claim() )
    );
} );

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener( 'fetch', event => {
    const { request } = event;
    const url = new URL( request.url );

    // Skip non-GET, chrome-extension, or data URIs
    if ( request.method !== 'GET' || url.protocol === 'chrome-extension:' ) return;

    // Skip third-party bypasses
    if ( BYPASS_ORIGINS.includes( url.hostname ) ) return;

    // Skip WordPress admin and REST API
    if ( url.pathname.startsWith( '/wp-admin' ) || url.pathname.startsWith( '/wp-json' ) ) return;

    const destination = request.destination;

    if ( destination === 'document' ) {
        event.respondWith( networkFirst( request, PAGE_CACHE ) );
    } else if ( [ 'style', 'script', 'font' ].includes( destination ) ) {
        event.respondWith( cacheFirst( request, STATIC_CACHE ) );
    } else if ( destination === 'image' ) {
        event.respondWith( staleWhileRevalidate( request, IMAGE_CACHE ) );
    }
} );

// ─── Strategies ──────────────────────────────────────────────────────────────

async function networkFirst( request, cacheName ) {
    const cache = await caches.open( cacheName );
    try {
        const networkResponse = await fetch( request );
        if ( networkResponse.ok ) {
            cache.put( request, networkResponse.clone() );
        }
        return networkResponse;
    } catch {
        const cached = await cache.match( request );
        return cached || caches.match( '/offline/' );
    }
}

async function cacheFirst( request, cacheName ) {
    const cache  = await caches.open( cacheName );
    const cached = await cache.match( request );
    if ( cached ) return cached;

    try {
        const networkResponse = await fetch( request );
        if ( networkResponse.ok ) cache.put( request, networkResponse.clone() );
        return networkResponse;
    } catch {
        return new Response( '', { status: 503 } );
    }
}

async function staleWhileRevalidate( request, cacheName ) {
    const cache  = await caches.open( cacheName );
    const cached = await cache.match( request );

    const networkFetch = fetch( request ).then( async response => {
        if ( response.ok ) {
            await cache.put( request, response.clone() );
            await trimImageCache( cache );
        }
        return response;
    } ).catch( () => cached );

    return cached || networkFetch;
}

async function trimImageCache( cache ) {
    const keys = await cache.keys();
    if ( keys.length <= MAX_IMAGE_ENTRIES ) return;

    // Delete oldest entries
    const toDelete = keys.slice( 0, keys.length - MAX_IMAGE_ENTRIES );
    await Promise.all( toDelete.map( key => cache.delete( key ) ) );
}
