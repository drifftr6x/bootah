#!/bin/bash
# Bootah64x Image Deployment Script
set -e

IMAGE_FILE="$1"
TARGET_DEVICE="$2"
VERIFY="$3"

echo "Starting image deployment"
echo "Source: $IMAGE_FILE"
echo "Target: $TARGET_DEVICE"

# Function to update progress
update_progress() {
    echo "PROGRESS:$1:$2"
}

# Verify image file exists
if [ ! -f "$IMAGE_FILE" ]; then
    echo "ERROR: Image file not found: $IMAGE_FILE"
    exit 1
fi

# Verify target device exists
if [ ! -b "$TARGET_DEVICE" ]; then
    echo "ERROR: Target device not found: $TARGET_DEVICE"
    exit 1
fi

update_progress 10 "Preparing target device"

# Unmount any mounted partitions on target device
for partition in $(mount | grep "^$TARGET_DEVICE" | awk '{print $1}'); do
    echo "Unmounting $partition"
    umount "$partition" || true
done

# Detect image format and deployment method
IMAGE_TYPE="unknown"
if file "$IMAGE_FILE" | grep -q "gzip"; then
    IMAGE_TYPE="gzip"
elif file "$IMAGE_FILE" | grep -q "bzip2"; then
    IMAGE_TYPE="bzip2"
elif file "$IMAGE_FILE" | grep -q "partclone"; then
    IMAGE_TYPE="partclone"
else
    IMAGE_TYPE="raw"
fi

update_progress 20 "Deploying image (type: $IMAGE_TYPE)"

# Deploy based on image type
case "$IMAGE_TYPE" in
    gzip)
        if command -v partclone.restore &> /dev/null && file "$IMAGE_FILE" | grep -q "partclone"; then
            gunzip -c "$IMAGE_FILE" | partclone.restore -o "$TARGET_DEVICE"
        else
            gunzip -c "$IMAGE_FILE" | dd of="$TARGET_DEVICE" bs=1M status=progress
        fi
        ;;
    bzip2)
        if command -v partclone.restore &> /dev/null && file "$IMAGE_FILE" | grep -q "partclone"; then
            bunzip2 -c "$IMAGE_FILE" | partclone.restore -o "$TARGET_DEVICE"
        else
            bunzip2 -c "$IMAGE_FILE" | dd of="$TARGET_DEVICE" bs=1M status=progress
        fi
        ;;
    partclone)
        partclone.restore -s "$IMAGE_FILE" -o "$TARGET_DEVICE"
        ;;
    *)
        dd if="$IMAGE_FILE" of="$TARGET_DEVICE" bs=1M status=progress
        ;;
esac

update_progress 80 "Syncing filesystem"
sync

if [ "$VERIFY" = "true" ]; then
    update_progress 90 "Verifying deployment"
    # Basic verification - check if partition table exists
    if parted "$TARGET_DEVICE" print &> /dev/null; then
        update_progress 100 "Deployment completed and verified"
        echo "SUCCESS: Image deployed successfully to $TARGET_DEVICE"
    else
        echo "ERROR: Verification failed - no valid partition table found"
        exit 1
    fi
else
    update_progress 100 "Deployment completed"
    echo "SUCCESS: Image deployed to $TARGET_DEVICE"
fi
