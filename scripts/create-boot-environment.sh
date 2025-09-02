#!/bin/bash
# Bootah64x Boot Environment Creation Script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PXE_FILES_DIR="$PROJECT_ROOT/pxe-files"
BUILD_DIR="$PROJECT_ROOT/build-boot"

echo "Creating Bootah64x boot environment..."
echo "Project root: $PROJECT_ROOT"
echo "PXE files dir: $PXE_FILES_DIR"

# Create build directory
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Function to download and extract if not exists
download_if_needed() {
    local url="$1"
    local filename="$2"
    local extract_dir="$3"
    
    if [ ! -f "$filename" ]; then
        echo "Downloading $filename..."
        wget "$url" -O "$filename"
    else
        echo "$filename already exists, skipping download"
    fi
    
    if [ ! -d "$extract_dir" ] && [ -n "$extract_dir" ]; then
        echo "Extracting $filename to $extract_dir..."
        mkdir -p "$extract_dir"
        case "$filename" in
            *.tar.xz) tar -xf "$filename" -C "$extract_dir" --strip-components=1 ;;
            *.tar.gz) tar -xzf "$filename" -C "$extract_dir" --strip-components=1 ;;
            *.zip) unzip -q "$filename" -d "$extract_dir" ;;
            *.iso) 
                mkdir -p "${extract_dir}_mount"
                mount -o loop "$filename" "${extract_dir}_mount" 2>/dev/null || {
                    # If mount fails, try with 7z or isoinfo
                    if command -v 7z &> /dev/null; then
                        7z x "$filename" -o"$extract_dir"
                    else
                        echo "Warning: Cannot extract ISO, mount and 7z not available"
                    fi
                }
                ;;
        esac
    fi
}

echo "Step 1: Getting PXE boot components..."

# Download SYSLINUX for PXE boot loader
SYSLINUX_URL="https://mirrors.edge.kernel.org/pub/linux/utils/boot/syslinux/syslinux-6.03.tar.xz"
download_if_needed "$SYSLINUX_URL" "syslinux-6.03.tar.xz" "syslinux"

# Download Alpine Linux for lightweight boot environment
ALPINE_URL="https://dl-cdn.alpinelinux.org/alpine/v3.18/releases/x86_64/alpine-standard-3.18.4-x86_64.iso"
download_if_needed "$ALPINE_URL" "alpine-standard.iso" "alpine"

echo "Step 2: Copying PXE boot files..."

# Copy PXELINUX files
if [ -d "syslinux" ]; then
    cp syslinux/bios/core/pxelinux.0 "$PXE_FILES_DIR/" 2>/dev/null || echo "pxelinux.0 not found in expected location"
    cp syslinux/bios/com32/elflink/ldlinux/ldlinux.c32 "$PXE_FILES_DIR/" 2>/dev/null || echo "ldlinux.c32 not found"
    cp syslinux/bios/com32/lib/libcom32.c32 "$PXE_FILES_DIR/" 2>/dev/null || echo "libcom32.c32 not found"
    cp syslinux/bios/com32/libutil/libutil.c32 "$PXE_FILES_DIR/" 2>/dev/null || echo "libutil.c32 not found"
    cp syslinux/bios/com32/menu/menu.c32 "$PXE_FILES_DIR/" 2>/dev/null || echo "menu.c32 not found"
    cp syslinux/bios/com32/modules/reboot.c32 "$PXE_FILES_DIR/" 2>/dev/null || echo "reboot.c32 not found"
    cp syslinux/bios/com32/modules/poweroff.c32 "$PXE_FILES_DIR/" 2>/dev/null || echo "poweroff.c32 not found"
    
    echo "SYSLINUX files copied"
else
    echo "SYSLINUX directory not found, creating minimal files..."
fi

echo "Step 3: Creating custom boot environments..."

# Create capture environment script
cat > create_capture_env.sh << 'EOF'
#!/bin/bash
# Create Bootah64x capture environment

# This would normally create a custom Linux environment with:
# - Partclone, dd, and other imaging tools
# - Network drivers and utilities  
# - SSH server for remote access
# - Bootah64x agent for communication with server

echo "Creating capture environment..."
mkdir -p bootah-capture

# For now, create a simple script that would be included
cat > bootah-capture/capture-agent.sh << 'CAPTURE_EOF'
#!/bin/bash
# Bootah64x Capture Agent

SERVER_IP="REPLACE_WITH_SERVER_IP"
DEVICE_MAC=$(cat /sys/class/net/eth0/address 2>/dev/null || echo "unknown")

# Register with server
curl -X POST "http://$SERVER_IP:5000/api/devices" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"PXE-$(hostname)\",\"macAddress\":\"$DEVICE_MAC\",\"ipAddress\":\"$(hostname -I | awk '{print $1}')\",\"status\":\"online\",\"architecture\":\"x86_64\"}"

echo "Capture agent ready. Waiting for instructions..."
while true; do
  sleep 30
  # Poll server for capture instructions
  curl -s "http://$SERVER_IP:5000/api/devices/by-mac/$DEVICE_MAC/commands" | grep -q "capture" && {
    echo "Capture command received"
    # Execute capture logic here
  }
done
CAPTURE_EOF

chmod +x bootah-capture/capture-agent.sh
EOF

chmod +x create_capture_env.sh
./create_capture_env.sh

# Create deployment environment script
cat > create_deploy_env.sh << 'EOF'
#!/bin/bash
# Create Bootah64x deployment environment

echo "Creating deployment environment..."
mkdir -p bootah-deploy

cat > bootah-deploy/deploy-agent.sh << 'DEPLOY_EOF'
#!/bin/bash
# Bootah64x Deployment Agent

SERVER_IP="REPLACE_WITH_SERVER_IP"
DEVICE_MAC=$(cat /sys/class/net/eth0/address 2>/dev/null || echo "unknown")

# Register with server
curl -X POST "http://$SERVER_IP:5000/api/devices" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"PXE-$(hostname)\",\"macAddress\":\"$DEVICE_MAC\",\"ipAddress\":\"$(hostname -I | awk '{print $1}')\",\"status\":\"online\",\"architecture\":\"x86_64\"}"

echo "Deployment agent ready. Waiting for instructions..."
while true; do
  sleep 30
  # Poll server for deployment instructions
  DEPLOYMENT=$(curl -s "http://$SERVER_IP:5000/api/devices/by-mac/$DEVICE_MAC/deployment")
  if echo "$DEPLOYMENT" | grep -q "pending"; then
    echo "Deployment command received"
    # Execute deployment logic here
    IMAGE_URL=$(echo "$DEPLOYMENT" | jq -r '.imageUrl')
    TARGET_DEVICE=$(echo "$DEPLOYMENT" | jq -r '.targetDevice')
    
    echo "Downloading image: $IMAGE_URL"
    wget "$IMAGE_URL" -O /tmp/deploy-image.img
    
    echo "Deploying to: $TARGET_DEVICE"
    dd if=/tmp/deploy-image.img of="$TARGET_DEVICE" bs=1M status=progress
    
    # Report completion
    curl -X PUT "http://$SERVER_IP:5000/api/deployments/$(echo "$DEPLOYMENT" | jq -r '.id')" \
      -H "Content-Type: application/json" \
      -d '{"status":"completed","progress":100}'
  fi
done
DEPLOY_EOF

chmod +x bootah-deploy/deploy-agent.sh
EOF

chmod +x create_deploy_env.sh
./create_deploy_env.sh

echo "Step 4: Creating kernel and initrd from Alpine..."

# Extract kernel and initrd from Alpine if available
if [ -d "alpine_mount" ]; then
    cp alpine_mount/boot/vmlinuz-lts "$PXE_FILES_DIR/vmlinuz" 2>/dev/null || echo "Kernel not found in Alpine"
    cp alpine_mount/boot/initramfs-lts "$PXE_FILES_DIR/initrd.img" 2>/dev/null || echo "Initrd not found in Alpine"
    umount alpine_mount 2>/dev/null || true
    rmdir alpine_mount 2>/dev/null || true
fi

echo "Step 5: Creating placeholder files for missing components..."

# Create placeholder boot files if they don't exist
[ ! -f "$PXE_FILES_DIR/vmlinuz" ] && {
    echo "Creating placeholder kernel..."
    echo "# Placeholder kernel - replace with actual Linux kernel" > "$PXE_FILES_DIR/vmlinuz"
}

[ ! -f "$PXE_FILES_DIR/initrd.img" ] && {
    echo "Creating placeholder initrd..."
    echo "# Placeholder initrd - replace with actual initramfs" > "$PXE_FILES_DIR/initrd.img"
}

[ ! -f "$PXE_FILES_DIR/pxelinux.0" ] && {
    echo "Creating placeholder pxelinux.0..."
    echo "# Placeholder PXE bootloader - replace with actual pxelinux.0" > "$PXE_FILES_DIR/pxelinux.0"
}

# Create missing .c32 files as placeholders
for file in menu.c32 reboot.c32 poweroff.c32 ldlinux.c32 libcom32.c32 libutil.c32; do
    [ ! -f "$PXE_FILES_DIR/$file" ] && {
        echo "# Placeholder $file - replace with actual SYSLINUX component" > "$PXE_FILES_DIR/$file"
    }
done

echo "Step 6: Finalizing setup..."

# Update server IP in config files
if [ -n "$SERVER_IP" ]; then
    sed -i "s/SERVERIP/$SERVER_IP/g" "$PXE_FILES_DIR/pxelinux.cfg/default"
    find bootah-* -name "*.sh" -exec sed -i "s/REPLACE_WITH_SERVER_IP/$SERVER_IP/g" {} \; 2>/dev/null || true
fi

echo ""
echo "=========================================="
echo "Bootah64x Boot Environment Created!"
echo "=========================================="
echo ""
echo "PXE Files Directory: $PXE_FILES_DIR"
echo ""
echo "Files created:"
echo "  - pxelinux.0 (PXE bootloader)"
echo "  - menu.c32 (Boot menu)"
echo "  - vmlinuz (Linux kernel)"
echo "  - initrd.img (Initial ramdisk)"
echo "  - pxelinux.cfg/default (Boot configuration)"
echo ""
echo "Boot environments:"
echo "  - bootah-capture/ (Image capture tools)"
echo "  - bootah-deploy/ (Image deployment tools)"
echo ""
echo "Next steps:"
echo "1. Replace placeholder files with actual boot components"
echo "2. Build custom initrd with imaging tools"
echo "3. Configure DHCP server to point to this PXE server"
echo "4. Start TFTP server on port 69 (requires root privileges)"
echo ""
echo "Note: Some files are placeholders and need to be replaced"
echo "with actual components for full functionality."
echo ""