# Bootah64x PXE Boot Testing Guide

This guide provides step-by-step instructions for testing PXE boot functionality with Clonezilla integration.

## Prerequisites

Before testing PXE boot, ensure the following are configured:

### Server Requirements (Bootah Server: 10.1.1.111)
- [ ] NFS server running with exports configured
- [ ] TFTP server running
- [ ] Clonezilla boot files present
- [ ] Bootah web application running on port 5000

### Network Requirements
- [ ] DHCP server configured with PXE options
- [ ] Client machine on same network segment
- [ ] Firewall ports open (TFTP: 69, NFS: 111, 2049, HTTP: 5000)

---

## Step 1: Verify Server Status

### Check NFS Exports
```bash
showmount -e 10.1.1.111
```
Expected output:
```
Export list for 10.1.1.111:
/opt/bootah/pxe-images *
/opt/bootah/pxe-files  *
```

### Check TFTP Server
```bash
sudo systemctl status tftpd-hpa
```

### Check Clonezilla Files
```bash
ls -la /opt/bootah/pxe-files/clonezilla/
```
Expected files:
- `vmlinuz` (~9MB)
- `initrd.img` (~38MB)
- `filesystem.squashfs` (~373MB)

### Check Bootah Service
```bash
sudo systemctl status bootah
curl http://10.1.1.111:5000/api/status
```

---

## Step 2: Configure DHCP Server

Your DHCP server must provide PXE boot options to clients. Add these settings to your DHCP configuration:

### For pfSense / OPNsense
1. Go to **Services → DHCP Server**
2. Select your LAN interface
3. Scroll to **TFTP Server** section
4. Set **TFTP Server**: `10.1.1.111`
5. Set **Network Boot**: Enable
6. Set **Next Server**: `10.1.1.111`
7. Set **Default BIOS file name**: `pxelinux.0`
8. Set **UEFI 64-bit file name**: `efi64/syslinux.efi`
9. Save and apply changes

### For ISC DHCP Server (Linux)
Add to `/etc/dhcp/dhcpd.conf`:
```
subnet 10.1.1.0 netmask 255.255.255.0 {
  range 10.1.1.100 10.1.1.200;
  option routers 10.1.1.1;
  option domain-name-servers 8.8.8.8, 8.8.4.4;
  
  # PXE Boot Options
  next-server 10.1.1.111;
  
  # Auto-detect BIOS vs UEFI
  if option arch = 00:07 {
    filename "efi64/syslinux.efi";
  } elsif option arch = 00:09 {
    filename "efi64/syslinux.efi";
  } else {
    filename "pxelinux.0";
  }
}
```
Restart DHCP: `sudo systemctl restart isc-dhcp-server`

### For Windows Server DHCP
1. Open **DHCP Manager**
2. Right-click your scope → **Configure Options**
3. Set **Option 66 (Boot Server Host Name)**: `10.1.1.111`
4. Set **Option 67 (Bootfile Name)**: `pxelinux.0`
5. For UEFI clients, create a vendor class and set to `efi64/syslinux.efi`

### For Proxmox Built-in DHCP (via dnsmasq)
Edit `/etc/dnsmasq.conf`:
```
dhcp-boot=pxelinux.0,,10.1.1.111
dhcp-match=set:efi64,option:client-arch,7
dhcp-boot=tag:efi64,efi64/syslinux.efi,,10.1.1.111
```
Restart: `sudo systemctl restart dnsmasq`

---

## Step 3: Prepare Test Client

### Physical Machine
1. Enter BIOS/UEFI settings (usually F2, F12, DEL, or ESC at boot)
2. Set boot order: Network/PXE first
3. For UEFI: Disable Secure Boot (or enable if your PXE files are signed)
4. Save and exit

### Virtual Machine (Proxmox)
1. Create or select a VM
2. Go to **Hardware → BIOS**: Set to `SeaBIOS` (Legacy) or `OVMF` (UEFI)
3. Go to **Options → Boot Order**: Enable `net0` and move to first
4. Start the VM

### Virtual Machine (VMware)
1. Edit VM settings
2. **Options → Advanced → Boot Options**
3. Check "Force EFI boot" for UEFI or leave unchecked for BIOS
4. Add network boot to boot order

---

## Step 4: PXE Boot Test

### Boot the Client
1. Power on or restart the client machine
2. Watch for "Booting from Network..." or similar message
3. Client should receive IP from DHCP
4. Client should download boot files from TFTP

### Expected Boot Sequence
1. **DHCP Discovery**: Client requests IP address
2. **DHCP Offer**: Server provides IP + PXE boot info
3. **TFTP Download**: Client downloads `pxelinux.0` or `syslinux.efi`
4. **Menu Display**: Bootah64x PXE Boot Menu appears

### Boot Menu Options
You should see the following menu:
```
╔════════════════════════════════════════════╗
║      Bootah64x PXE Boot Menu               ║
╠════════════════════════════════════════════╣
║ 1) Boot from Local Disk                    ║
║ 2) Clonezilla Live (Full Environment)      ║
║ 3) Capture System Image                    ║
║ 4) Deploy System Image                     ║
║ 5) Quick Capture (Minimal prompts)         ║
║ 6) Batch Deploy (Auto mode)                ║
║ 7) Clonezilla Shell (Advanced)             ║
║ 8) Memory Test (Memtest86+)                ║
║ 9) Reboot System                           ║
║ 0) Power Off System                        ║
╚════════════════════════════════════════════╝
```

---

## Step 5: Test Each Boot Option

### Option 1: Boot from Local Disk
- Select this to exit PXE and boot normally
- Useful for machines that PXE boot by default

### Option 2: Clonezilla Live (Full Environment)
- Boots full Clonezilla with GUI
- Use for manual imaging operations
- Provides access to all Clonezilla tools

### Option 3: Capture System Image
1. Select this option
2. Clonezilla loads and mounts NFS share
3. Follow prompts to select source disk
4. Enter image name when prompted
5. Image saves to `/opt/bootah/pxe-images/` on server

### Option 4: Deploy System Image
1. Select this option
2. Clonezilla loads and mounts NFS share
3. Select image from available list
4. Select target disk
5. Confirm and deploy

### Option 5: Quick Capture (sda)
- Automated capture of first disk (sda)
- Only prompts for image name
- Fastest option for single-disk systems

### Option 6: Batch Deploy
- Fully automated deployment
- Requires image name to be pre-configured
- Auto-reboots after completion

### Option 7: Clonezilla Shell
- Drops to command line
- For advanced troubleshooting
- Manual access to ocs-sr and other tools

---

## Step 6: Verify Image Capture

After capturing an image, verify on the server:

```bash
ls -la /opt/bootah/pxe-images/
```

You should see your captured image folder containing:
- `blk*.list` - Block device information
- `disk.dd-ptcl-img.gz.*` - Partition table backup
- `sda*.aa` - Disk image chunks
- `clonezilla-img` - Image metadata

---

## Troubleshooting

### Client doesn't get IP address
- Verify DHCP server is running
- Check network connectivity (cables, switches)
- Ensure client NIC supports PXE

### Client gets IP but no boot menu
- Check TFTP server is running: `sudo systemctl status tftpd-hpa`
- Verify TFTP files exist: `ls /opt/bootah/pxe-files/tftp/`
- Check firewall: `sudo ufw status` (port 69 should be open)
- Test TFTP manually: `tftp 10.1.1.111 -c get pxelinux.0`

### Boot menu appears but Clonezilla fails to load
- Verify NFS exports: `showmount -e 10.1.1.111`
- Check Clonezilla files exist in `/opt/bootah/pxe-files/clonezilla/`
- Verify firewall allows NFS (ports 111, 2049)

### Clonezilla loads but can't mount NFS share
- Check NFS server: `sudo systemctl status nfs-kernel-server`
- Test NFS mount manually: `sudo mount -t nfs 10.1.1.111:/opt/bootah/pxe-images /mnt`
- Verify export options: `sudo exportfs -v`

### Image capture fails
- Ensure enough disk space: `df -h /opt/bootah/pxe-images`
- Check NFS write permissions
- Verify the source disk is not in use

### UEFI clients fail to boot
- Use `efi64/syslinux.efi` as boot file
- Disable Secure Boot if not using signed boot files
- Some UEFI systems need specific DHCP options

---

## Network Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   DHCP Server   │     │  Bootah Server  │     │   PXE Client    │
│   (Router/       │────│   10.1.1.111    │────│  (Any Machine)  │
│    Dedicated)   │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 1. DHCP Discover     │                       │
        │◄──────────────────────┼───────────────────────│
        │                       │                       │
        │ 2. DHCP Offer        │                       │
        │  (IP + PXE info)     │                       │
        │──────────────────────►│                       │
        │                       │                       │
        │                       │ 3. TFTP Request      │
        │                       │◄──────────────────────│
        │                       │                       │
        │                       │ 4. Boot Files        │
        │                       │──────────────────────►│
        │                       │                       │
        │                       │ 5. NFS Mount         │
        │                       │◄──────────────────────│
        │                       │                       │
        │                       │ 6. Image Transfer    │
        │                       │◄─────────────────────►│
```

---

## Quick Reference

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| DHCP | 67-68 | UDP | IP assignment + PXE info |
| TFTP | 69 | UDP | Boot file transfer |
| NFS | 111, 2049 | TCP/UDP | Image storage |
| HTTP | 5000 | TCP | Bootah web interface |

### Useful Commands
```bash
# Check all services
sudo systemctl status tftpd-hpa nfs-kernel-server bootah

# View NFS exports
sudo exportfs -v

# Test NFS connectivity
showmount -e 10.1.1.111

# Check TFTP files
ls -la /opt/bootah/pxe-files/tftp/

# Check images
ls -la /opt/bootah/pxe-images/

# Monitor PXE traffic (run during client boot)
sudo tcpdump -i any port 67 or port 68 or port 69

# Check firewall rules
sudo ufw status verbose
```

---

## Support

For issues not covered here:
1. Check Bootah web interface logs at http://10.1.1.111:5000
2. Review system logs: `sudo journalctl -u bootah -f`
3. Check Clonezilla documentation: https://clonezilla.org/
