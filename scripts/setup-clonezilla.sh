#!/bin/bash
# Bootah64x - Clonezilla Integration Setup Script
# This script downloads and configures Clonezilla for PXE booting

set -e

CLONEZILLA_VERSION="3.1.2-22"
CLONEZILLA_ARCH="amd64"
CLONEZILLA_FILE="clonezilla-live-${CLONEZILLA_VERSION}-${CLONEZILLA_ARCH}.iso"
CLONEZILLA_URL="https://downloads.sourceforge.net/clonezilla/${CLONEZILLA_FILE}"

PXE_DIR="$(pwd)/pxe-files"
DOWNLOAD_DIR="/tmp/clonezilla-download"

echo "========================================="
echo "Bootah64x - Clonezilla Integration Setup"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "⚠️  Warning: Some operations may require sudo privileges"
   echo ""
fi

# Create directories
echo "Creating directory structure..."
mkdir -p "$PXE_DIR"/{clonezilla,syslinux,tftp}
mkdir -p "$DOWNLOAD_DIR"

# Download Clonezilla if not already present
if [ ! -f "$DOWNLOAD_DIR/$CLONEZILLA_FILE" ]; then
    echo "Downloading Clonezilla Live ${CLONEZILLA_VERSION}..."
    echo "Source: $CLONEZILLA_URL"
    echo ""
    
    wget -O "$DOWNLOAD_DIR/$CLONEZILLA_FILE" "$CLONEZILLA_URL" || {
        echo "❌ Download failed. Trying alternate mirror..."
        CLONEZILLA_URL="https://osdn.net/projects/clonezilla/downloads/79341/${CLONEZILLA_FILE}"
        wget -O "$DOWNLOAD_DIR/$CLONEZILLA_FILE" "$CLONEZILLA_URL"
    }
else
    echo "✅ Clonezilla ISO already downloaded"
fi

# Install required tools
echo ""
echo "Checking dependencies..."
if ! command -v 7z &> /dev/null; then
    echo "Installing p7zip-full..."
    sudo apt-get update
    sudo apt-get install -y p7zip-full
fi

# Extract Clonezilla ISO
echo ""
echo "Extracting Clonezilla ISO..."
7z x "$DOWNLOAD_DIR/$CLONEZILLA_FILE" -o"$DOWNLOAD_DIR/extracted" -y > /dev/null 2>&1

# Copy kernel and initrd
echo "Copying kernel and initrd..."
cp "$DOWNLOAD_DIR/extracted/live/vmlinuz" "$PXE_DIR/clonezilla/"
cp "$DOWNLOAD_DIR/extracted/live/initrd.img" "$PXE_DIR/clonezilla/"
cp "$DOWNLOAD_DIR/extracted/live/filesystem.squashfs" "$PXE_DIR/clonezilla/"

# Download and install SYSLINUX/PXELINUX
SYSLINUX_VERSION="6.03"
SYSLINUX_FILE="syslinux-${SYSLINUX_VERSION}.tar.xz"
SYSLINUX_URL="https://mirrors.edge.kernel.org/pub/linux/utils/boot/syslinux/${SYSLINUX_FILE}"

if [ ! -f "$DOWNLOAD_DIR/$SYSLINUX_FILE" ]; then
    echo ""
    echo "Downloading SYSLINUX ${SYSLINUX_VERSION}..."
    wget -O "$DOWNLOAD_DIR/$SYSLINUX_FILE" "$SYSLINUX_URL"
fi

echo "Extracting SYSLINUX..."
tar -xf "$DOWNLOAD_DIR/$SYSLINUX_FILE" -C "$DOWNLOAD_DIR"

# Copy PXELINUX files
echo "Installing PXE bootloader files..."
cp "$DOWNLOAD_DIR/syslinux-${SYSLINUX_VERSION}/bios/core/pxelinux.0" "$PXE_DIR/tftp/"
cp "$DOWNLOAD_DIR/syslinux-${SYSLINUX_VERSION}/bios/com32/menu/menu.c32" "$PXE_DIR/tftp/"
cp "$DOWNLOAD_DIR/syslinux-${SYSLINUX_VERSION}/bios/com32/modules/reboot.c32" "$PXE_DIR/tftp/"
cp "$DOWNLOAD_DIR/syslinux-${SYSLINUX_VERSION}/bios/com32/modules/poweroff.c32" "$PXE_DIR/tftp/"
cp "$DOWNLOAD_DIR/syslinux-${SYSLINUX_VERSION}/bios/com32/chain/chain.c32" "$PXE_DIR/tftp/"
cp "$DOWNLOAD_DIR/syslinux-${SYSLINUX_VERSION}/bios/com32/lib/libcom32.c32" "$PXE_DIR/tftp/"
cp "$DOWNLOAD_DIR/syslinux-${SYSLINUX_VERSION}/bios/com32/libutil/libutil.c32" "$PXE_DIR/tftp/"
cp "$DOWNLOAD_DIR/syslinux-${SYSLINUX_VERSION}/bios/com32/elflink/ldlinux/ldlinux.c32" "$PXE_DIR/tftp/"

# Copy UEFI files
echo "Installing UEFI bootloader files..."
mkdir -p "$PXE_DIR/tftp/efi64"
cp "$DOWNLOAD_DIR/syslinux-${SYSLINUX_VERSION}/efi64/efi/syslinux.efi" "$PXE_DIR/tftp/efi64/"
cp "$DOWNLOAD_DIR/syslinux-${SYSLINUX_VERSION}/efi64/com32/menu/menu.c32" "$PXE_DIR/tftp/efi64/"
cp "$DOWNLOAD_DIR/syslinux-${SYSLINUX_VERSION}/efi64/com32/elflink/ldlinux/ldlinux.e64" "$PXE_DIR/tftp/efi64/"

# Set permissions
echo "Setting permissions..."
chmod 644 "$PXE_DIR/tftp/"*
chmod 644 "$PXE_DIR/clonezilla/"*

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================="
echo "✅ Clonezilla Integration Complete!"
echo "========================================="
echo ""
echo "Installed Components:"
echo "  • Clonezilla Live ${CLONEZILLA_VERSION}"
echo "  • SYSLINUX/PXELINUX ${SYSLINUX_VERSION}"
echo "  • UEFI and Legacy BIOS support"
echo ""
echo "Files installed to:"
echo "  • $PXE_DIR/clonezilla/"
echo "  • $PXE_DIR/tftp/"
echo ""
echo "Next Steps:"
echo "  1. Update your DHCP server configuration:"
echo "     - Next-server: $SERVER_IP"
echo "     - Boot filename (BIOS): tftp/pxelinux.0"
echo "     - Boot filename (UEFI): tftp/efi64/syslinux.efi"
echo ""
echo "  2. Start Bootah64x server:"
echo "     npm run dev"
echo ""
echo "  3. Configure PXE boot on target machines"
echo ""
echo "Cleanup temporary files? (y/n)"
read -r cleanup
if [ "$cleanup" = "y" ]; then
    rm -rf "$DOWNLOAD_DIR"
    echo "✅ Cleanup complete"
fi
