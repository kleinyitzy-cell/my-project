#!/usr/bin/env bash
# =============================================================================
# Churchville Dental Care — Image Optimization Script
# Converts all JPG/PNG to WebP + AVIF, generates responsive srcsets,
# strips metadata, and enforces max dimensions for mobile.
# =============================================================================
# Dependencies: cwebp, avifenc (libavif), ImageMagick (convert), jpegoptim, optipng
# Install on Ubuntu/Debian:
#   apt-get install -y webp libavif-bin imagemagick jpegoptim optipng
# =============================================================================

set -euo pipefail

SRC_DIR="${1:-./wp-content/uploads}"
QUALITY_WEBP=82
QUALITY_AVIF=60
QUALITY_JPEG=82
MAX_WIDTH=1920   # never exceed 1920px wide (hero)
THUMB_WIDTHS=(480 800 1200) # srcset breakpoints

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()  { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERR]${NC} $*"; }

check_deps() {
    local missing=()
    for cmd in cwebp convert jpegoptim optipng; do
        command -v "$cmd" &>/dev/null || missing+=("$cmd")
    done
    if [ ${#missing[@]} -gt 0 ]; then
        err "Missing tools: ${missing[*]}"
        echo "Install with: apt-get install -y webp imagemagick jpegoptim optipng"
        exit 1
    fi
    command -v avifenc &>/dev/null || warn "avifenc not found — AVIF output skipped"
}

# Convert bytes to human-readable
hr_bytes() { echo "$(( $1 / 1024 ))KB"; }

process_jpeg() {
    local src="$1"
    local orig_size; orig_size=$(stat -c%s "$src")

    # 1. Resize if wider than MAX_WIDTH
    local width; width=$(identify -format "%w" "$src" 2>/dev/null || echo 0)
    if [ "$width" -gt "$MAX_WIDTH" ]; then
        convert "$src" -resize "${MAX_WIDTH}x>" "$src"
        warn "Resized $src to max ${MAX_WIDTH}px wide"
    fi

    # 2. Strip metadata + optimise in-place
    jpegoptim --max="$QUALITY_JPEG" --strip-all --all-progressive "$src" -q

    # 3. Generate WebP
    local webp="${src%.*}.webp"
    if [ ! -f "$webp" ] || [ "$src" -nt "$webp" ]; then
        cwebp -q "$QUALITY_WEBP" -metadata none "$src" -o "$webp" -quiet
        log "WebP created: $webp ($(hr_bytes "$(stat -c%s "$webp")"))"
    fi

    # 4. Generate AVIF (if avifenc available)
    if command -v avifenc &>/dev/null; then
        local avif="${src%.*}.avif"
        if [ ! -f "$avif" ] || [ "$src" -nt "$avif" ]; then
            avifenc --min 30 --max 40 --speed 6 "$src" "$avif" &>/dev/null
            log "AVIF created: $avif ($(hr_bytes "$(stat -c%s "$avif")"))"
        fi
    fi

    # 5. Generate responsive srcset variants
    for w in "${THUMB_WIDTHS[@]}"; do
        local thumb="${src%.*}-${w}w.webp"
        if [ ! -f "$thumb" ] || [ "$src" -nt "$thumb" ]; then
            convert "$src" -resize "${w}x>" - 2>/dev/null \
                | cwebp -q "$QUALITY_WEBP" -metadata none - -o "$thumb" -quiet
            log "Responsive WebP: $thumb"
        fi
    done

    local new_size; new_size=$(stat -c%s "$src")
    local saved=$(( orig_size - new_size ))
    [ "$saved" -gt 0 ] && log "Saved $(hr_bytes "$saved") on $src"
}

process_png() {
    local src="$1"
    local orig_size; orig_size=$(stat -c%s "$src")

    # 1. Resize if too wide
    local width; width=$(identify -format "%w" "$src" 2>/dev/null || echo 0)
    if [ "$width" -gt "$MAX_WIDTH" ]; then
        convert "$src" -resize "${MAX_WIDTH}x>" "$src"
        warn "Resized $src to max ${MAX_WIDTH}px wide"
    fi

    # 2. Lossless optimise
    optipng -o2 -strip all -quiet "$src"

    # 3. WebP (lossless for logos/icons, lossy for photos)
    local webp="${src%.*}.webp"
    if [ ! -f "$webp" ] || [ "$src" -nt "$webp" ]; then
        # Detect if the PNG has transparency
        local has_alpha; has_alpha=$(identify -format "%[channels]" "$src" 2>/dev/null || echo "")
        if [[ "$has_alpha" == *"alpha"* ]]; then
            cwebp -lossless -metadata none "$src" -o "$webp" -quiet
        else
            cwebp -q "$QUALITY_WEBP" -metadata none "$src" -o "$webp" -quiet
        fi
        log "WebP created: $webp"
    fi

    # 4. Responsive srcset
    for w in "${THUMB_WIDTHS[@]}"; do
        local thumb="${src%.*}-${w}w.webp"
        if [ ! -f "$thumb" ] || [ "$src" -nt "$thumb" ]; then
            convert "$src" -resize "${w}x>" - 2>/dev/null \
                | cwebp -q "$QUALITY_WEBP" -metadata none - -o "$thumb" -quiet
            log "Responsive WebP: $thumb"
        fi
    done
}

generate_srcset_html() {
    # Utility: print the <img> HTML with srcset for a given file
    local src="$1"
    local alt="${2:-Image}"
    local base="${src%.*}"

    echo "<picture>"
    if [ -f "${base}.avif" ]; then
        echo "  <source type=\"image/avif\""
        echo "    srcset=\"${base}-480w.avif 480w, ${base}-800w.avif 800w, ${base}.avif 1200w\""
        echo "    sizes=\"(max-width: 480px) 480px, (max-width: 800px) 800px, 1200px\">"
    fi
    echo "  <source type=\"image/webp\""
    echo "    srcset=\"${base}-480w.webp 480w, ${base}-800w.webp 800w, ${base}.webp 1200w\""
    echo "    sizes=\"(max-width: 480px) 480px, (max-width: 800px) 800px, 1200px\">"
    echo "  <img src=\"${src}\" alt=\"${alt}\" loading=\"lazy\" decoding=\"async\""
    echo "       width=\"1200\" height=\"auto\">"
    echo "</picture>"
}

main() {
    check_deps

    echo "Scanning: $SRC_DIR"
    local total=0 processed=0

    while IFS= read -r -d '' file; do
        (( total++ ))
        ext="${file##*.}"
        ext="${ext,,}" # lowercase
        case "$ext" in
            jpg|jpeg) process_jpeg "$file"; (( processed++ )) ;;
            png)      process_png "$file";  (( processed++ )) ;;
        esac
    done < <( find "$SRC_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) -print0 )

    echo ""
    echo "════════════════════════════════════════"
    echo "  Processed: $processed / $total images"
    echo "  Output: WebP + AVIF + responsive srcsets"
    echo "════════════════════════════════════════"
}

main "$@"
