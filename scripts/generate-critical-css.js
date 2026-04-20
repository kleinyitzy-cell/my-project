#!/usr/bin/env node
/**
 * Churchville Dental Care — Critical CSS Generator
 * Extracts above-the-fold CSS using Penthouse/critical and writes it to
 * wp-content/themes/<theme>/css/critical.css for inlining in <head>.
 *
 * Usage:
 *   node generate-critical-css.js [--url https://churchvilledentalcare.com] [--out ./critical.css]
 *
 * Install deps first:
 *   npm install penthouse puppeteer-core
 */

'use strict';

const fs        = require( 'fs' );
const path      = require( 'path' );
const penthouse = require( 'penthouse' );

const args    = process.argv.slice( 2 );
const getArg  = ( flag ) => { const i = args.indexOf( flag ); return i > -1 ? args[ i + 1 ] : null; };

const TARGET_URL = getArg( '--url' ) || 'https://churchvilledentalcare.com';
const OUT_FILE   = getArg( '--out' ) || path.join( __dirname, '../css/critical.css' );

// Mobile viewport (matches PSI mobile audit)
const VIEWPORT = { width: 390, height: 844 };

async function generate() {
    console.log( `Generating critical CSS for: ${TARGET_URL}` );
    console.log( `Viewport: ${VIEWPORT.width}×${VIEWPORT.height}` );

    let css;
    try {
        css = await penthouse( {
            url:                 TARGET_URL,
            width:               VIEWPORT.width,
            height:              VIEWPORT.height,
            timeout:             60000,
            maxEmbeddedBase64Length: 1000,
            forceInclude: [
                // Always include these selectors (above-fold visible classes)
                '.site-header',
                '.nav-primary',
                '.hero',
                '.hero *',
                '.site-branding',
                '.banner',
                'h1', 'h2',
                '.btn', '.button',
                'body', 'html', '*',
            ],
            forceExclude: [
                // Never include these (below fold / not visible on load)
                '.footer',
                '#footer',
                '.gallery',
                '.slider-dots',
                '.testimonials',
                '.team-grid',
                '.blog-posts',
            ],
            puppeteer: {
                args: [ '--no-sandbox', '--disable-setuid-sandbox' ],
            },
        } );
    } catch ( err ) {
        console.error( 'Penthouse error:', err.message );
        console.log( 'Falling back to manual critical CSS template...' );
        css = getFallbackCritical();
    }

    // Post-process: remove @font-face (already loaded via <link>), compress
    css = css
        .replace( /@font-face\s*\{[^}]*\}/g, '' )
        .replace( /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '' ) // strip comments
        .replace( /\s{2,}/g, ' ' )
        .replace( /;\s*}/g, '}' )
        .trim();

    const outDir = path.dirname( OUT_FILE );
    if ( ! fs.existsSync( outDir ) ) fs.mkdirSync( outDir, { recursive: true } );

    fs.writeFileSync( OUT_FILE, css );
    console.log( `✓ Critical CSS written to: ${OUT_FILE} (${( css.length / 1024 ).toFixed( 1 )} KB)` );
}

/**
 * Hand-crafted fallback for dental site above-the-fold styles.
 * Replace these values with the actual theme's styles if Penthouse fails.
 */
function getFallbackCritical() {
    return `
/* Critical CSS — above the fold only */
*,*::before,*::after{box-sizing:border-box}
html{font-size:16px;-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;font-family:'Open Sans',Arial,sans-serif;font-display:swap;color:#333;background:#fff;line-height:1.6}
img{max-width:100%;height:auto;display:block}
a{color:#0057a8;text-decoration:none}
h1,h2,h3{margin:0 0 .5em;line-height:1.2;font-weight:700}
h1{font-size:clamp(1.75rem,5vw,2.5rem)}
h2{font-size:clamp(1.4rem,4vw,2rem)}

/* Header */
.site-header{position:sticky;top:0;z-index:100;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.1);padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between}
.site-logo img{height:50px;width:auto}
.nav-primary{display:flex;gap:1.5rem;list-style:none;margin:0;padding:0}
.nav-primary a{font-weight:600;color:#333;font-size:.95rem}
.nav-primary a:hover{color:#0057a8}

/* CTA Button */
.btn,.button,.wp-block-button__link{display:inline-block;padding:.65rem 1.4rem;background:#0057a8;color:#fff;border-radius:4px;font-weight:700;font-size:1rem;text-align:center;white-space:nowrap;transition:background .2s}
.btn:hover,.button:hover{background:#003d78;color:#fff}
.btn-secondary{background:#f5f5f5;color:#0057a8;border:2px solid #0057a8}

/* Hero */
.hero,.hero-section,.banner{position:relative;min-height:320px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;background:#0057a8}
.hero-content{position:relative;z-index:2;max-width:700px;padding:2rem 1rem;color:#fff}
.hero h1{color:#fff;margin-bottom:1rem}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top}

/* Lazy image fade-in */
img[loading="lazy"]{opacity:0;transition:opacity .3s ease}
img[loading="lazy"].loaded{opacity:1}

/* Font display swap fallback — hides FOUT flash */
.fonts-loaded body{font-family:'Open Sans',Arial,sans-serif}

/* Skip link */
.skip-link{position:absolute;top:-40px;left:0;background:#0057a8;color:#fff;padding:.5rem 1rem;z-index:999;border-radius:0 0 4px 0}
.skip-link:focus{top:0}

/* Mobile nav toggle */
@media(max-width:768px){
  .nav-primary{display:none;flex-direction:column;position:absolute;top:100%;left:0;right:0;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.15);padding:1rem}
  .nav-primary.open{display:flex}
  .nav-toggle{display:block;background:none;border:none;cursor:pointer;padding:.5rem}
  .hero{min-height:240px}
}
@media(min-width:769px){.nav-toggle{display:none}}
`;
}

generate().catch( err => {
    console.error( 'Fatal:', err );
    process.exit( 1 );
} );
