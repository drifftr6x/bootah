#!/bin/bash
# Bootah64x - Clonezilla Deploy Wrapper Script
# Integrates Clonezilla deployment with Bootah64x web interface

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
        -d "{\"action\":\"deploy\",\"details\":\"$message\",\"deviceMac\":\"$DEVICE_MAC\",\"level\":\"$level\"}" \
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

# Start deployment process
log_to_bootah "Starting image deployment for $HOSTNAME ($DEVICE_MAC)" "info"
update_deployment_status "deploying" 0

# Display welcome message
clear
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                  Bootah64x Image Deployment               ║
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
    update_deployment_status "deploying" 10
else
    log_to_bootah "Failed to mount NFS share" "error"
    update_deployment_status "failed" 0
    echo "ERROR: Could not mount NFS share"
    echo "Press Enter to continue..."
    read
    exit 1
fi

# List available images
echo ""
echo "Available Images:"
echo "════════════════════════════════════════"
ls -1 /home/partimag/ | grep -v "lost+found" | nl
echo "════════════════════════════════════════"
echo ""

# Prompt for image selection
echo -n "Enter image number to deploy (or 'q' to quit): "
read IMAGE_SELECTION

if [ "$IMAGE_SELECTION" = "q" ]; then
    log_to_bootah "Deployment cancelled by user" "info"
    update_deployment_status "cancelled" 0
    umount /home/partimag
    exit 0
fi

# Get image name from selection
IMAGE_NAME=$(ls -1 /home/partimag/ | grep -v "lost+found" | sed -n "${IMAGE_SELECTION}p")

if [ -z "$IMAGE_NAME" ]; then
    log_to_bootah "Invalid image selection" "error"
    update_deployment_status "failed" 0
    echo "ERROR: Invalid selection"
    umount /home/partimag
    exit 1
fi

echo ""
echo "Selected image: $IMAGE_NAME"
echo ""

# Get target disk
echo "Available Disks:"
echo "════════════════════════════════════════"
lsblk -d -o NAME,SIZE,MODEL | grep -v "loop\|sr"
echo "════════════════════════════════════════"
echo ""
echo -n "Enter target disk (e.g., sda, nvme0n1): "
read TARGET_DISK

# Confirm deployment
echo ""
echo "⚠️  WARNING: This will ERASE all data on /dev/$TARGET_DISK"
echo ""
echo "Image: $IMAGE_NAME"
echo "Target: /dev/$TARGET_DISK"
echo ""
echo -n "Type 'YES' to confirm deployment: "
read CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    log_to_bootah "Deployment not confirmed" "info"
    update_deployment_status "cancelled" 0
    echo "Deployment cancelled"
    umount /home/partimag
    exit 0
fi

log_to_bootah "Deploying $IMAGE_NAME to /dev/$TARGET_DISK" "info"
update_deployment_status "deploying" 20

# Launch Clonezilla restore
# -g auto: Automatically detect grub
# -e1 auto: Automatically adjust filesystem UUID
# -e2: Restore MBR/GPT
# -r: Auto reboot after completion
# -j2: Clone hidden data
# -c: Wait for confirmation
# -p choose: Choose action when finished

echo ""
echo "Starting Clonezilla deployment..."
echo ""

/usr/sbin/ocs-sr -g auto -e1 auto -e2 -r -j2 -c -p choose restoredisk "$IMAGE_NAME" "$TARGET_DISK"

DEPLOY_RESULT=$?

if [ $DEPLOY_RESULT -eq 0 ]; then
    log_to_bootah "Image deployment completed successfully" "success"
    update_deployment_status "completed" 100
    
    echo ""
    echo "═══════════════════════════════════════"
    echo "✅ Image Deployment Complete!"
    echo "═══════════════════════════════════════"
    echo "Image: $IMAGE_NAME"
    echo "Target: /dev/$TARGET_DISK"
    echo ""
else
    log_to_bootah "Image deployment failed with code $DEPLOY_RESULT" "error"
    update_deployment_status "failed" 0
    
    echo ""
    echo "═══════════════════════════════════════"
    echo "❌ Image Deployment Failed"
    echo "═══════════════════════════════════════"
    echo "Error code: $DEPLOY_RESULT"
    echo ""
fi

# Unmount NFS
umount /home/partimag

echo "System will reboot in 10 seconds..."
echo "Press Ctrl+C to cancel..."
sleep 10
reboot
