/**
 * Churchville Dental Care — Performance Runtime
 * Handles: lazy images, lazy iframes, font loading, Service Worker registration.
 * This script is loaded with defer so the DOM is ready when it runs.
 */

( function () {
    'use strict';

    // ─── Service Worker ───────────────────────────────────────────────────────
    if ( 'serviceWorker' in navigator ) {
        window.addEventListener( 'load', function () {
            navigator.serviceWorker.register( '/sw.js', { scope: '/' } )
                .catch( function ( err ) {
                    console.warn( 'SW registration failed:', err );
                } );
        } );
    }

    // ─── Lazy Images (IntersectionObserver) ───────────────────────────────────
    function initLazyImages() {
        // Native lazy loading is sufficient for modern browsers;
        // this polyfill handles edge cases and adds blur-up transitions.
        const images = document.querySelectorAll( 'img[loading="lazy"], img[data-src]' );
        if ( ! images.length ) return;

        if ( ! ( 'IntersectionObserver' in window ) ) {
            // Fallback: load all immediately
            images.forEach( loadImage );
            return;
        }

        const observer = new IntersectionObserver(
            function ( entries ) {
                entries.forEach( function ( entry ) {
                    if ( entry.isIntersecting ) {
                        loadImage( entry.target );
                        observer.unobserve( entry.target );
                    }
                } );
            },
            { rootMargin: '200px 0px' } // start loading 200px before viewport
        );

        images.forEach( function ( img ) {
            if ( img.dataset.src ) {
                observer.observe( img );
            }
        } );
    }

    function loadImage( img ) {
        if ( img.dataset.src ) {
            img.src    = img.dataset.src;
            img.removeAttribute( 'data-src' );
        }
        if ( img.dataset.srcset ) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute( 'data-srcset' );
        }
        img.classList.add( 'loaded' );
    }

    // ─── Lazy Iframes ─────────────────────────────────────────────────────────
    function initLazyIframes() {
        const iframes = document.querySelectorAll( 'iframe[data-src]' );
        if ( ! iframes.length ) return;

        if ( ! ( 'IntersectionObserver' in window ) ) {
            iframes.forEach( loadIframe );
            return;
        }

        const observer = new IntersectionObserver(
            function ( entries ) {
                entries.forEach( function ( entry ) {
                    if ( entry.isIntersecting ) {
                        loadIframe( entry.target );
                        observer.unobserve( entry.target );
                    }
                } );
            },
            { rootMargin: '400px 0px' }
        );

        iframes.forEach( function ( iframe ) { observer.observe( iframe ); } );
    }

    function loadIframe( iframe ) {
        iframe.src = iframe.dataset.src;
        iframe.removeAttribute( 'data-src' );
    }

    // ─── Google Maps facade ───────────────────────────────────────────────────
    function initMapFacades() {
        document.querySelectorAll( '[data-map-facade]' ).forEach( function ( el ) {
            el.addEventListener( 'click', function () {
                var iframe = document.createElement( 'iframe' );
                iframe.src    = el.dataset.mapSrc;
                iframe.width  = '100%';
                iframe.height = el.offsetHeight + 'px';
                iframe.style.border = '0';
                iframe.loading = 'lazy';
                iframe.allowFullscreen = true;
                iframe.referrerPolicy  = 'no-referrer-when-downgrade';
                el.replaceWith( iframe );
            }, { once: true } );
        } );
    }

    // ─── Font loading (FontFace Observer pattern) ─────────────────────────────
    function loadFontsAsync() {
        // If sessionStorage already set, fonts are cached — skip flash
        if ( sessionStorage.getItem( 'fontsLoaded' ) ) {
            document.documentElement.classList.add( 'fonts-loaded' );
            return;
        }

        if ( 'fonts' in document ) {
            // Use CSS Font Loading API
            Promise.all( [
                document.fonts.load( '1em "Open Sans"' ),
                document.fonts.load( 'bold 1em "Open Sans"' ),
            ] ).then( function () {
                document.documentElement.classList.add( 'fonts-loaded' );
                sessionStorage.setItem( 'fontsLoaded', '1' );
            } );
        }
    }

    // ─── Deferred Third-Party Scripts ─────────────────────────────────────────
    function deferThirdParty() {
        // Load non-critical third-party scripts after user interaction
        var loaded = false;

        function loadScripts() {
            if ( loaded ) return;
            loaded = true;

            var scripts = document.querySelectorAll( 'script[data-defer-src]' );
            scripts.forEach( function ( s ) {
                var el    = document.createElement( 'script' );
                el.src    = s.dataset.deferSrc;
                el.async  = true;
                document.body.appendChild( el );
                s.remove();
            } );
        }

        // Trigger on first user interaction
        [ 'mousedown', 'keydown', 'touchstart', 'scroll' ].forEach( function ( evt ) {
            window.addEventListener( evt, loadScripts, { once: true, passive: true } );
        } );

        // Hard fallback: load after 5 s regardless
        setTimeout( loadScripts, 5000 );
    }

    // ─── LCP Image hint ───────────────────────────────────────────────────────
    function boostLCP() {
        // Ensure the above-the-fold hero image has fetchpriority=high
        var hero = document.querySelector( '.hero img, .banner img, #hero img, [data-hero] img' );
        if ( hero && ! hero.getAttribute( 'fetchpriority' ) ) {
            hero.setAttribute( 'fetchpriority', 'high' );
            hero.setAttribute( 'loading', 'eager' );
        }
    }

    // ─── CLS: reserve space for late-loading content ──────────────────────────
    function preventCLS() {
        // Add explicit aspect-ratio to images missing width/height
        document.querySelectorAll( 'img:not([width]):not([height])' ).forEach( function ( img ) {
            img.addEventListener( 'load', function () {
                if ( img.naturalWidth && img.naturalHeight ) {
                    img.setAttribute( 'width',  img.naturalWidth );
                    img.setAttribute( 'height', img.naturalHeight );
                }
            } );
        } );
    }

    // ─── Init ─────────────────────────────────────────────────────────────────
    initLazyImages();
    initLazyIframes();
    initMapFacades();
    loadFontsAsync();
    deferThirdParty();
    boostLCP();
    preventCLS();

} )();
