#!/bin/bash
# Bootah64x Deployment Agent for PXE Boot Environment

SERVER_IP="${SERVER_IP:-127.0.0.1}"
DEVICE_MAC=$(cat /sys/class/net/*/address 2>/dev/null | head -1 || echo "unknown")
HOSTNAME=$(hostname 2>/dev/null || echo "pxe-client")

echo "===================================="
echo "Bootah64x Image Deployment Agent"
echo "===================================="
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
        \"architecture\":\"x86_64\",
        \"model\":\"PXE Client\",
        \"manufacturer\":\"Bootah64x\"
      }" 2>/dev/null || echo "Registration failed"
}

# Check for deployment commands
check_for_deployments() {
    echo "Polling for deployment commands..."
    while true; do
        local deployments=$(curl -s "http://$SERVER_IP:5000/api/deployments/active" 2>/dev/null || echo "[]")
        
        if echo "$deployments" | grep -q "deploying"; then
            echo "Active deployment detected!"
            # In a real environment, this would download and deploy images
            echo "Starting image deployment process..."
            echo "Note: This is a demonstration - real deployment would use dd/partclone"
            
            # Simulate deployment progress
            for i in {1..10}; do
                echo "Deployment progress: $((i*10))%"
                sleep 2
            done
            
            echo "Deployment completed (simulated)"
        fi
        
        sleep 30
    done
}

# Main execution
register_device
check_for_deployments