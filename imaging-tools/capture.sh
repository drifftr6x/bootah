#!/bin/bash
# Bootah64x Image Capture Script
set -e

DEVICE="$1"
OUTPUT_FILE="$2"
COMPRESSION="$3"
EXCLUDE_SWAP="$4"
EXCLUDE_TMP="$5"

echo "Starting image capture from $DEVICE"
echo "Output: $OUTPUT_FILE"
echo "Compression: $COMPRESSION"

# Detect available tools
if command -v partclone.ext4 &> /dev/null; then
    CAPTURE_TOOL="partclone"
elif command -v dd &> /dev/null; then
    CAPTURE_TOOL="dd"
else
    echo "ERROR: No imaging tools available"
    exit 1
fi

# Create output directory
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Function to update progress
update_progress() {
    echo "PROGRESS:$1:$2"
}

# Capture image based on available tools
if [ "$CAPTURE_TOOL" = "partclone" ]; then
    update_progress 10 "Detecting filesystem"
    
    # Detect filesystem type
    FSTYPE=$(blkid -o value -s TYPE "$DEVICE" || echo "unknown")
    
    case "$FSTYPE" in
        ext2|ext3|ext4)
            PARTCLONE_CMD="partclone.ext4"
            ;;
        ntfs)
            PARTCLONE_CMD="partclone.ntfs"
            ;;
        fat16|fat32|vfat)
            PARTCLONE_CMD="partclone.fat"
            ;;
        *)
            echo "WARNING: Unknown filesystem $FSTYPE, using dd"
            CAPTURE_TOOL="dd"
            ;;
    esac
fi

if [ "$CAPTURE_TOOL" = "partclone" ]; then
    update_progress 20 "Starting partition capture with $PARTCLONE_CMD"
    
    if [ "$COMPRESSION" = "gzip" ]; then
        $PARTCLONE_CMD -c -s "$DEVICE" | gzip > "$OUTPUT_FILE.gz"
        mv "$OUTPUT_FILE.gz" "$OUTPUT_FILE"
    elif [ "$COMPRESSION" = "bzip2" ]; then
        $PARTCLONE_CMD -c -s "$DEVICE" | bzip2 > "$OUTPUT_FILE.bz2"
        mv "$OUTPUT_FILE.bz2" "$OUTPUT_FILE"
    else
        $PARTCLONE_CMD -c -s "$DEVICE" -o "$OUTPUT_FILE"
    fi
else
    update_progress 20 "Starting raw disk capture with dd"
    
    BLOCK_SIZE="1M"
    DEVICE_SIZE=$(blockdev --getsize64 "$DEVICE" 2>/dev/null || echo "0")
    
    if [ "$COMPRESSION" = "gzip" ]; then
        dd if="$DEVICE" bs="$BLOCK_SIZE" status=progress | gzip > "$OUTPUT_FILE.gz"
        mv "$OUTPUT_FILE.gz" "$OUTPUT_FILE"
    elif [ "$COMPRESSION" = "bzip2" ]; then
        dd if="$DEVICE" bs="$BLOCK_SIZE" status=progress | bzip2 > "$OUTPUT_FILE.bz2"
        mv "$OUTPUT_FILE.bz2" "$OUTPUT_FILE"
    else
        dd if="$DEVICE" of="$OUTPUT_FILE" bs="$BLOCK_SIZE" status=progress
    fi
fi

update_progress 90 "Verifying image integrity"
if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(stat -c%s "$OUTPUT_FILE")
    if [ "$FILE_SIZE" -gt 1024 ]; then
        update_progress 100 "Image capture completed successfully"
        echo "SUCCESS: Image captured to $OUTPUT_FILE ($FILE_SIZE bytes)"
    else
        echo "ERROR: Image file is too small, capture may have failed"
        exit 1
    fi
else
    echo "ERROR: Output file not created"
    exit 1
fi
