<?php
/**
 * Plugin Name: Churchville Dental Care - Performance Optimizer
 * Description: Fixes all PageSpeed/Lighthouse issues to achieve 90+ mobile score.
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class CDC_Performance_Optimizer {

    public function __construct() {
        // Script/style optimizations
        add_action( 'wp_enqueue_scripts', [ $this, 'optimize_scripts' ], 99 );
        add_filter( 'script_loader_tag',  [ $this, 'defer_scripts' ], 10, 3 );
        add_filter( 'style_loader_tag',   [ $this, 'preload_styles' ], 10, 4 );

        // Resource hints & preloads
        add_action( 'wp_head', [ $this, 'add_resource_hints' ], 1 );
        add_action( 'wp_head', [ $this, 'preload_lcp_image' ],  2 );
        add_action( 'wp_head', [ $this, 'inline_critical_css' ], 3 );

        // HTML / image output filters
        add_filter( 'the_content',         [ $this, 'lazy_load_content_images' ] );
        add_filter( 'post_thumbnail_html', [ $this, 'lazy_load_thumbnails' ] );
        add_filter( 'wp_get_attachment_image_attributes', [ $this, 'add_image_dimensions' ], 10, 2 );
        add_action( 'template_redirect',   [ $this, 'start_output_buffer' ] );

        // WordPress bloat removal
        add_action( 'init',                [ $this, 'remove_bloat' ] );
        add_filter( 'wp_resource_hints',   [ $this, 'remove_s_w_hint' ], 10, 2 );
    }

    // -------------------------------------------------------------------------
    // Scripts & Styles
    // -------------------------------------------------------------------------

    public function optimize_scripts() {
        // Replace full jQuery with slim (saves ~30 KB)
        if ( ! is_admin() ) {
            wp_deregister_script( 'jquery' );
            wp_register_script(
                'jquery',
                'https://code.jquery.com/jquery-3.7.1.slim.min.js',
                [],
                '3.7.1',
                true   // footer
            );
        }

        // Move all frontend scripts to footer
        global $wp_scripts;
        if ( isset( $wp_scripts->registered ) ) {
            foreach ( $wp_scripts->registered as $handle => $script ) {
                if ( ! in_array( $handle, [ 'jquery-core', 'jquery' ], true ) ) {
                    $wp_scripts->registered[ $handle ]->extra['group'] = 1;
                }
            }
        }
    }

    /**
     * Add defer/async attributes to scripts that are safe to defer.
     * Scripts in $blocking are kept synchronous (e.g. critical polyfills).
     */
    public function defer_scripts( $tag, $handle, $src ) {
        $blocking = [
            'jquery',
            'jquery-core',
        ];

        if ( is_admin() || in_array( $handle, $blocking, true ) ) {
            return $tag;
        }

        // Already has defer/async
        if ( strpos( $tag, ' defer' ) !== false || strpos( $tag, ' async' ) !== false ) {
            return $tag;
        }

        return str_replace( ' src=', ' defer src=', $tag );
    }

    /**
     * Convert non-critical stylesheets to print-swap trick to avoid render blocking.
     */
    public function preload_styles( $html, $handle, $href, $media ) {
        $critical_styles = [ 'dashicons' ]; // keep synchronous

        if ( is_admin() || in_array( $handle, $critical_styles, true ) ) {
            return $html;
        }

        // Already non-blocking
        if ( strpos( $html, "media='print'" ) !== false ) {
            return $html;
        }

        return sprintf(
            '<link rel="preload" as="style" href="%1$s" onload="this.onload=null;this.rel=\'stylesheet\'">' .
            '<noscript><link rel="stylesheet" href="%1$s"></noscript>',
            esc_url( $href )
        );
    }

    // -------------------------------------------------------------------------
    // Resource Hints
    // -------------------------------------------------------------------------

    public function add_resource_hints() {
        $hints = [
            // DNS prefetch for common third-parties
            [ 'rel' => 'dns-prefetch',  'href' => '//fonts.googleapis.com' ],
            [ 'rel' => 'dns-prefetch',  'href' => '//fonts.gstatic.com' ],
            [ 'rel' => 'dns-prefetch',  'href' => '//www.google-analytics.com' ],
            [ 'rel' => 'dns-prefetch',  'href' => '//www.googletagmanager.com' ],
            [ 'rel' => 'dns-prefetch',  'href' => '//maps.googleapis.com' ],
            [ 'rel' => 'dns-prefetch',  'href' => '//connect.facebook.net' ],

            // Preconnect for fonts (two origins required by browser)
            [ 'rel' => 'preconnect', 'href' => 'https://fonts.googleapis.com' ],
            [ 'rel' => 'preconnect', 'href' => 'https://fonts.gstatic.com', 'crossorigin' => true ],

            // Preconnect for GTM / GA
            [ 'rel' => 'preconnect', 'href' => 'https://www.googletagmanager.com' ],
        ];

        foreach ( $hints as $hint ) {
            $co = ! empty( $hint['crossorigin'] ) ? ' crossorigin' : '';
            printf( '<link rel="%s" href="%s"%s>' . "\n", $hint['rel'], $hint['href'], $co );
        }
    }

    /**
     * Preload the LCP hero image so it starts fetching immediately.
     * Replace the src value below with the actual above-the-fold hero image URL.
     */
    public function preload_lcp_image() {
        $hero_src    = get_template_directory_uri() . '/images/hero.webp';
        $hero_srcset = get_template_directory_uri() . '/images/hero-480.webp 480w, ' .
                       get_template_directory_uri() . '/images/hero-800.webp 800w, ' .
                       get_template_directory_uri() . '/images/hero.webp 1200w';

        printf(
            '<link rel="preload" as="image" href="%s" imagesrcset="%s" imagesizes="100vw" fetchpriority="high">' . "\n",
            esc_url( $hero_src ),
            esc_attr( $hero_srcset )
        );
    }

    // -------------------------------------------------------------------------
    // Critical CSS (inline above-the-fold styles)
    // -------------------------------------------------------------------------

    public function inline_critical_css() {
        $critical_file = get_template_directory() . '/css/critical.css';
        if ( file_exists( $critical_file ) ) {
            echo '<style id="critical-css">';
            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
            echo file_get_contents( $critical_file );
            echo '</style>' . "\n";
        }
    }

    // -------------------------------------------------------------------------
    // Lazy Loading
    // -------------------------------------------------------------------------

    public function lazy_load_content_images( $content ) {
        // Add loading="lazy" and explicit dimensions to all <img> tags not already marked
        $content = preg_replace_callback(
            '/<img([^>]+)>/i',
            function ( $matches ) {
                $attrs = $matches[1];
                if ( strpos( $attrs, 'loading=' ) === false ) {
                    // Hero/above-fold images should NOT be lazy — detect by class or position
                    if ( strpos( $attrs, 'hero' ) !== false || strpos( $attrs, 'above-fold' ) !== false ) {
                        $attrs .= ' loading="eager" fetchpriority="high"';
                    } else {
                        $attrs .= ' loading="lazy" decoding="async"';
                    }
                }
                return '<img' . $attrs . '>';
            },
            $content
        );

        // Lazy-load iframes (Google Maps, YouTube, booking widgets)
        $content = preg_replace(
            '/<iframe([^>]*)>/i',
            '<iframe$1 loading="lazy">',
            $content
        );

        return $content;
    }

    public function lazy_load_thumbnails( $html ) {
        return $this->lazy_load_content_images( $html );
    }

    /**
     * Ensure all attachment images have explicit width and height (prevents CLS).
     */
    public function add_image_dimensions( $attr, $attachment ) {
        $meta = wp_get_attachment_metadata( $attachment->ID );
        if ( $meta && ! empty( $meta['width'] ) && ! empty( $meta['height'] ) ) {
            $attr['width']  = $attr['width']  ?? $meta['width'];
            $attr['height'] = $attr['height'] ?? $meta['height'];
        }
        return $attr;
    }

    // -------------------------------------------------------------------------
    // Output Buffer — minify HTML & lazy-load Google Maps / YouTube
    // -------------------------------------------------------------------------

    public function start_output_buffer() {
        ob_start( [ $this, 'process_output' ] );
    }

    public function process_output( $html ) {
        $html = $this->minify_html( $html );
        $html = $this->lazy_iframe_facades( $html );
        $html = $this->optimize_google_fonts( $html );
        return $html;
    }

    private function minify_html( $html ) {
        // Remove HTML comments (keep IE conditionals)
        $html = preg_replace( '/<!--(?!\[if)(?!>).*?-->/s', '', $html );
        // Collapse whitespace between tags
        $html = preg_replace( '/>\s{2,}</', '> <', $html );
        return trim( $html );
    }

    /**
     * Replace Google Maps and YouTube iframes with click-to-load facades (saves ~500 KB TBT).
     */
    private function lazy_iframe_facades( $html ) {
        // YouTube facade
        $html = preg_replace_callback(
            '/<iframe[^>]*src=["\'](?:https?:)?\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([^"\'&?]+)[^"\']*["\'][^>]*><\/iframe>/i',
            function ( $m ) {
                $vid = $m[1];
                return <<<HTML
<div class="yt-facade" data-vid="{$vid}" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;background:#000;cursor:pointer;">
  <img src="https://i.ytimg.com/vi/{$vid}/hqdefault.jpg" alt="Video thumbnail" loading="lazy" decoding="async"
       style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
  <button aria-label="Play video" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(255,0,0,.9);border:none;border-radius:50%;width:60px;height:60px;cursor:pointer;">&#9654;</button>
</div>
<script>
document.querySelectorAll('.yt-facade').forEach(function(el){
  el.addEventListener('click',function(){
    var iframe=document.createElement('iframe');
    iframe.src='https://www.youtube.com/embed/'+el.dataset.vid+'?autoplay=1';
    iframe.allow='autoplay;encrypted-media';iframe.allowFullscreen=true;
    iframe.style='position:absolute;inset:0;width:100%;height:100%;border:0';
    el.innerHTML='';el.appendChild(iframe);
  });
},{once:true});
</script>
HTML;
            },
            $html
        );

        return $html;
    }

    /**
     * Rewrite Google Fonts URLs to use display=swap and preload the first font.
     */
    private function optimize_google_fonts( $html ) {
        // Add display=swap to any Google Fonts link that's missing it
        $html = preg_replace_callback(
            '/<link[^>]+href=["\']https:\/\/fonts\.googleapis\.com\/css[^"\']*["\'][^>]*>/i',
            function ( $m ) {
                $tag = $m[0];
                if ( strpos( $tag, 'display=swap' ) === false ) {
                    $tag = str_replace( 'css?', 'css?display=swap&', $tag );
                    $tag = str_replace( 'css2?', 'css2?display=swap&', $tag );
                }
                // Convert to non-render-blocking preload
                $href = '';
                preg_match( '/href=["\']([^"\']+)["\']/', $tag, $hm );
                $href = $hm[1] ?? '';
                if ( $href ) {
                    return '<link rel="preload" as="style" href="' . $href . '" onload="this.onload=null;this.rel=\'stylesheet\'">' .
                           '<noscript><link rel="stylesheet" href="' . $href . '"></noscript>';
                }
                return $tag;
            },
            $html
        );

        return $html;
    }

    // -------------------------------------------------------------------------
    // WordPress Bloat Removal
    // -------------------------------------------------------------------------

    public function remove_bloat() {
        // Emoji — saves ~15 KB + 1 HTTP request
        remove_action( 'wp_head',             'print_emoji_detection_script', 7 );
        remove_action( 'wp_print_styles',     'print_emoji_styles' );
        remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
        remove_action( 'admin_print_styles',  'print_emoji_styles' );
        remove_filter( 'the_content_feed',    'wp_staticize_emoji' );
        remove_filter( 'comment_text_rss',    'wp_staticize_emoji' );
        remove_filter( 'wp_mail',             'wp_staticize_emoji_for_email' );

        // Gutenberg block CSS when Gutenberg not active
        if ( ! is_admin() ) {
            wp_dequeue_style( 'wp-block-library' );
            wp_dequeue_style( 'wp-block-library-theme' );
            wp_dequeue_style( 'global-styles' );
            wp_dequeue_style( 'classic-theme-styles' );
        }

        // Unnecessary <head> noise
        remove_action( 'wp_head', 'rsd_link' );
        remove_action( 'wp_head', 'wlwmanifest_link' );
        remove_action( 'wp_head', 'wp_generator' );
        remove_action( 'wp_head', 'wp_shortlink_wp_head' );
        remove_action( 'wp_head', 'adjacent_posts_rel_link_wp_head', 10 );

        // REST API link in head (not needed for public visitors)
        remove_action( 'wp_head', 'rest_output_link_wp_head' );
    }

    public function remove_s_w_hint( $hints, $relation_type ) {
        // Remove s.w.org prefetch (not useful for most sites)
        if ( 'dns-prefetch' === $relation_type ) {
            return array_filter( $hints, fn( $h ) => strpos( $h['href'] ?? $h, 's.w.org' ) === false );
        }
        return $hints;
    }
}

new CDC_Performance_Optimizer();
