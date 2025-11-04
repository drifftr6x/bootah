#!/bin/bash
# Bootah64x - PXE Server Configuration Script
# Configures IP addresses and NFS exports for Clonezilla integration

set -e

# Detect server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
PXE_CONFIG_FILE="pxe-files/pxelinux.cfg/default"
BACKUP_CONFIG="${PXE_CONFIG_FILE}.backup"

echo "========================================="
echo "Bootah64x - PXE Server Configuration"
echo "========================================="
echo ""
echo "Detected Server IP: $SERVER_IP"
echo ""

# Backup existing config
if [ -f "$PXE_CONFIG_FILE" ]; then
    cp "$PXE_CONFIG_FILE" "$BACKUP_CONFIG"
    echo "✅ Backed up existing configuration"
fi

# Replace placeholder IP with actual server IP
echo "Updating PXE configuration with server IP..."
sed -i "s/BOOTAH_SERVER_IP/$SERVER_IP/g" "$PXE_CONFIG_FILE"

# Replace full path placeholders
sed -i "s|PXE_FILES_FULL_PATH|$PXE_FILES_PATH|g" "$PXE_CONFIG_FILE"
sed -i "s|PXE_IMAGES_FULL_PATH|$PXE_IMAGES_PATH|g" "$PXE_CONFIG_FILE"

# Also update wrapper scripts
for script in pxe-files/bootah-clonezilla-capture.sh pxe-files/bootah-clonezilla-deploy.sh; do
    if [ -f "$script" ]; then
        sed -i "s/BOOTAH_SERVER_IP/$SERVER_IP/g" "$script"
    fi
done

echo "✅ Configuration updated"

# Setup NFS exports
echo ""
echo "Configuring NFS server..."

# Install NFS server if not present
if ! command -v exportfs &> /dev/null; then
    echo "Installing NFS server..."
    sudo apt-get update
    sudo apt-get install -y nfs-kernel-server
fi

# Create NFS export for pxe-files and pxe-images
PXE_FILES_PATH="$(pwd)/pxe-files"
PXE_IMAGES_PATH="$(pwd)/pxe-images"

# Add to /etc/exports if not already present
if ! grep -q "$PXE_FILES_PATH" /etc/exports; then
    echo "$PXE_FILES_PATH *(ro,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
    echo "✅ Added pxe-files NFS export"
fi

if ! grep -q "$PXE_IMAGES_PATH" /etc/exports; then
    echo "$PXE_IMAGES_PATH *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
    echo "✅ Added pxe-images NFS export"
fi

# Reload NFS exports
sudo exportfs -ra
echo "✅ NFS exports configured"

# Start NFS server
sudo systemctl enable nfs-kernel-server
sudo systemctl restart nfs-kernel-server
echo "✅ NFS server started"

# Configure firewall for NFS
echo ""
echo "Configuring firewall for NFS..."
sudo ufw allow from any to any port 2049 proto tcp
sudo ufw allow from any to any port 2049 proto udp
sudo ufw allow from any to any port 111 proto tcp
sudo ufw allow from any to any port 111 proto udp
echo "✅ Firewall configured for NFS"

# Install and configure TFTP server
echo ""
echo "Installing TFTP server..."
if ! command -v in.tftpd &> /dev/null; then
    sudo apt-get install -y tftpd-hpa
fi

# Configure TFTP
TFTP_CONFIG="/etc/default/tftpd-hpa"
sudo tee "$TFTP_CONFIG" > /dev/null <<EOF
TFTP_USERNAME="tftp"
TFTP_DIRECTORY="$(pwd)/pxe-files/tftp"
TFTP_ADDRESS="0.0.0.0:69"
TFTP_OPTIONS="--secure"
EOF

sudo systemctl enable tftpd-hpa
sudo systemctl restart tftpd-hpa
echo "✅ TFTP server configured"

# Display DHCP configuration
echo ""
echo "========================================="
echo "✅ PXE Server Configuration Complete!"
echo "========================================="
echo ""
echo "Server Configuration:"
echo "  • Server IP: $SERVER_IP"
echo "  • NFS Exports:"
echo "    - $PXE_FILES_PATH (read-only)"
echo "    - $PXE_IMAGES_PATH (read-write)"
echo "  • TFTP Root: $(pwd)/pxe-files/tftp"
echo ""
echo "DHCP Server Configuration Required:"
echo "========================================="
echo "Add these options to your DHCP server:"
echo ""
echo "For Legacy BIOS clients:"
echo "  next-server $SERVER_IP;"
echo "  filename \"pxelinux.0\";"
echo ""
echo "For UEFI clients:"
echo "  next-server $SERVER_IP;"
echo "  filename \"efi64/syslinux.efi\";"
echo ""
echo "For automatic detection (ISC DHCP):"
echo "  if exists user-class and option user-class = \"iPXE\" {"
echo "    filename \"http://$SERVER_IP:5000/boot.ipxe\";"
echo "  } elsif option arch = 00:07 {"
echo "    filename \"efi64/syslinux.efi\";"
echo "  } else {"
echo "    filename \"pxelinux.0\";"
echo "  }"
echo "  next-server $SERVER_IP;"
echo ""
echo "Test NFS exports with:"
echo "  showmount -e $SERVER_IP"
echo ""
