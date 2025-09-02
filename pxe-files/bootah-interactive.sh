#!/bin/bash
# Bootah64x Interactive PXE Client

SERVER_IP="${SERVER_IP:-127.0.0.1}"
DEVICE_MAC=$(cat /sys/class/net/*/address 2>/dev/null | head -1 || echo "unknown")
HOSTNAME=$(hostname 2>/dev/null || echo "pxe-client")

echo "========================================="
echo "Bootah64x Interactive PXE Client"
echo "========================================="
echo "Server: $SERVER_IP"
echo "MAC: $DEVICE_MAC"
echo "Hostname: $HOSTNAME"
echo ""

# Register device with server
register_device() {
    local ip=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+' || echo "unknown")
    
    echo "Registering with Bootah64x server..."
    curl -X POST "http://$SERVER_IP:5000/api/devices" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\":\"PXE-$HOSTNAME\",
        \"macAddress\":\"$DEVICE_MAC\",
        \"ipAddress\":\"$ip\",
        \"status\":\"online\",
        \"model\":\"PXE Interactive Client\",
        \"manufacturer\":\"Bootah64x\"
      }" 2>/dev/null || echo "Registration failed"
}

# Show interactive menu
show_menu() {
    echo ""
    echo "Available Actions:"
    echo "1) Check for scheduled capture jobs"
    echo "2) Start immediate image capture"
    echo "3) Check for deployment instructions"
    echo "4) View system information"
    echo "5) Exit to local boot"
    echo ""
    echo -n "Select option [1-5]: "
}

# Check for scheduled captures
check_scheduled_captures() {
    echo "Checking for scheduled capture jobs..."
    local response=$(curl -s "http://$SERVER_IP:5000/api/devices/by-mac/$DEVICE_MAC/commands" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "capture"; then
        echo "✓ Capture job found!"
        echo "Details: $(echo "$response" | grep -o '"details":[^}]*}')"
        echo ""
        echo -n "Start capture now? [y/N]: "
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            start_capture
        fi
    else
        echo "No scheduled capture jobs found."
    fi
}

# Start immediate capture
start_capture() {
    echo ""
    echo "Starting image capture..."
    echo "Note: This is a demonstration - real capture would:"
    echo "  • Detect available disks"
    echo "  • Use partclone or dd for imaging"
    echo "  • Stream progress to Bootah64x server"
    echo ""
    
    # Simulate capture progress
    for i in {1..10}; do
        echo "Capture progress: $((i*10))%"
        sleep 1
    done
    
    echo "✓ Image capture completed (simulated)"
    echo "Image would be uploaded to Bootah64x server"
}

# Check for deployments
check_deployments() {
    echo "Checking for deployment instructions..."
    local deployment=$(curl -s "http://$SERVER_IP:5000/api/devices/by-mac/$DEVICE_MAC/deployment" 2>/dev/null || echo "")
    
    if echo "$deployment" | grep -q "pending\|deploying"; then
        echo "✓ Deployment found!"
        local image_url=$(echo "$deployment" | grep -o '"imageUrl":"[^"]*"' | cut -d'"' -f4)
        echo "Image URL: $image_url"
        echo ""
        echo -n "Start deployment now? [y/N]: "
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            start_deployment "$image_url"
        fi
    else
        echo "No pending deployments found."
    fi
}

# Start deployment
start_deployment() {
    local image_url="$1"
    echo ""
    echo "Starting image deployment..."
    echo "Source: $image_url"
    echo "Target: /dev/sda"
    echo ""
    
    # Simulate deployment progress
    for i in {1..20}; do
        echo "Deployment progress: $((i*5))%"
        sleep 1
    done
    
    echo "✓ Deployment completed (simulated)"
    echo "System ready for reboot"
}

# Show system information
show_system_info() {
    echo ""
    echo "System Information:"
    echo "==================="
    echo "Hostname: $HOSTNAME"
    echo "MAC Address: $DEVICE_MAC"
    echo "IP Address: $(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+' || echo 'unknown')"
    echo "Memory: $(free -h 2>/dev/null | grep '^Mem:' | awk '{print $2}' || echo 'unknown')"
    echo "Kernel: $(uname -r 2>/dev/null || echo 'unknown')"
    echo ""
    echo "Available Disks:"
    lsblk -o NAME,SIZE,TYPE 2>/dev/null | grep disk || echo "No disks detected"
    echo ""
    echo "Network Interfaces:"
    ip addr show 2>/dev/null | grep -E "inet|ether" | grep -v 127.0.0.1 || echo "No network info"
}

# Main interactive loop
main() {
    register_device
    
    while true; do
        show_menu
        read -r choice
        
        case $choice in
            1)
                check_scheduled_captures
                ;;
            2)
                start_capture
                ;;
            3)
                check_deployments
                ;;
            4)
                show_system_info
                ;;
            5)
                echo "Exiting to local boot..."
                echo "Rebooting system..."
                # In real environment: reboot
                exit 0
                ;;
            *)
                echo "Invalid option. Please select 1-5."
                ;;
        esac
        
        echo ""
        echo -n "Press Enter to continue..."
        read -r
    done
}

# Run main function
main