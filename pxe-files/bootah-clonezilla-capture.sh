#!/bin/bash
# Bootah64x - Clonezilla Capture Wrapper Script
# Integrates Clonezilla capture with Bootah64x web interface

BOOTAH_API="http://BOOTAH_SERVER_IP:5000/api"
DEVICE_MAC=$(cat /sys/class/net/$(ip route show default | awk '/default/ {print $5}')/address)
DEVICE_IP=$(hostname -I | awk '{print $1}')
HOSTNAME=$(hostname)

# Function to log to Bootah64x
log_to_bootah() {
    local message="$1"
    local level="${2:-info}"
    
    curl -s -X POST "$BOOTAH_API/activity" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"capture\",\"details\":\"$message\",\"deviceMac\":\"$DEVICE_MAC\",\"level\":\"$level\"}" \
        > /dev/null 2>&1 || true
}

# Function to update deployment status
update_deployment_status() {
    local status="$1"
    local progress="$2"
    
    curl -s -X POST "$BOOTAH_API/deployments/status" \
        -H "Content-Type: application/json" \
        -d "{\"deviceMac\":\"$DEVICE_MAC\",\"status\":\"$status\",\"progress\":$progress}" \
        > /dev/null 2>&1 || true
}

# Start capture process
log_to_bootah "Starting image capture for $HOSTNAME ($DEVICE_MAC)" "info"
update_deployment_status "capturing" 0

# Display welcome message
clear
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                   Bootah64x Image Capture                 ║
║                  Powered by Clonezilla                    ║
╚═══════════════════════════════════════════════════════════╝
EOF

echo ""
echo "Device Information:"
echo "  MAC Address: $DEVICE_MAC"
echo "  IP Address:  $DEVICE_IP"
echo "  Hostname:    $HOSTNAME"
echo ""
echo "Mounting NFS share..."

# Mount NFS share
mount -t nfs BOOTAH_SERVER_IP:/pxe-images /home/partimag
if [ $? -eq 0 ]; then
    log_to_bootah "NFS share mounted successfully" "info"
    update_deployment_status "capturing" 10
else
    log_to_bootah "Failed to mount NFS share" "error"
    update_deployment_status "failed" 0
    echo "ERROR: Could not mount NFS share"
    echo "Press Enter to continue..."
    read
    exit 1
fi

# Generate image name with timestamp
IMAGE_NAME="${HOSTNAME}-$(date +%Y%m%d-%H%M%S)"
echo ""
echo "Image will be saved as: $IMAGE_NAME"
echo ""

# Check disk space
AVAILABLE_SPACE=$(df -h /home/partimag | awk 'NR==2 {print $4}')
echo "Available storage: $AVAILABLE_SPACE"
echo ""

log_to_bootah "Starting Clonezilla capture to $IMAGE_NAME" "info"
update_deployment_status "capturing" 20

# Launch Clonezilla in automated mode
# -q2: Use partclone
# -c: Wait for user confirmation before rebooting
# -j2: Clone hidden data
# -z1p: Use parallel gzip compression
# -i 4096: Set buffer size
# -sfsck: Skip filesystem check
# -senc: Skip encryption
# -p choose: Let user choose what to do when finished

echo "Starting Clonezilla..."
echo ""

/usr/sbin/ocs-sr -q2 -c -j2 -z1p -i 4096 -sfsck -senc -p choose savedisk "$IMAGE_NAME" sda

CAPTURE_RESULT=$?

if [ $CAPTURE_RESULT -eq 0 ]; then
    log_to_bootah "Image capture completed successfully: $IMAGE_NAME" "success"
    update_deployment_status "completed" 100
    
    # Register image with Bootah64x
    IMAGE_SIZE=$(du -sh "/home/partimag/$IMAGE_NAME" | cut -f1)
    curl -s -X POST "$BOOTAH_API/images" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$IMAGE_NAME\",\"osType\":\"detected\",\"size\":\"$IMAGE_SIZE\",\"path\":\"/pxe-images/$IMAGE_NAME\",\"capturedFrom\":\"$DEVICE_MAC\"}" \
        > /dev/null 2>&1 || true
    
    echo ""
    echo "═══════════════════════════════════════"
    echo "✅ Image Capture Complete!"
    echo "═══════════════════════════════════════"
    echo "Image Name: $IMAGE_NAME"
    echo "Image Size: $IMAGE_SIZE"
    echo "Location: /pxe-images/$IMAGE_NAME"
    echo ""
else
    log_to_bootah "Image capture failed with code $CAPTURE_RESULT" "error"
    update_deployment_status "failed" 0
    
    echo ""
    echo "═══════════════════════════════════════"
    echo "❌ Image Capture Failed"
    echo "═══════════════════════════════════════"
    echo "Error code: $CAPTURE_RESULT"
    echo ""
fi

# Unmount NFS
umount /home/partimag

echo "Press Enter to reboot or Ctrl+C to return to menu..."
read
reboot
