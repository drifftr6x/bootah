#!/bin/bash
# Bootah Multicast Deployment Agent
# This script runs on PXE-booted clients to receive multicast images

set -e

BOOTAH_SERVER="${BOOTAH_SERVER:-}"
BOOTAH_PORT="${BOOTAH_PORT:-5000}"
BOOTAH_MODE="${BOOTAH_MODE:-multicast}"
MULTICAST_PORT="${MULTICAST_PORT:-9000}"
CONTROL_PORT="${CONTROL_PORT:-9001}"
TARGET_DISK="${TARGET_DISK:-/dev/sda}"
LOG_FILE="/var/log/bootah-agent.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

get_mac_address() {
    ip link show | awk '/ether/{print $2; exit}' | tr ':' '-'
}

get_ip_address() {
    ip route get 1 | awk '{print $7; exit}'
}

send_heartbeat() {
    local session_id="$1"
    local status="$2"
    local progress="$3"
    local bytes_received="$4"
    
    curl -s -X POST "http://${BOOTAH_SERVER}:${BOOTAH_PORT}/api/multicast/client/heartbeat" \
        -H "Content-Type: application/json" \
        -d "{
            \"sessionId\": \"${session_id}\",
            \"macAddress\": \"$(get_mac_address)\",
            \"status\": \"${status}\",
            \"progress\": ${progress},
            \"bytesReceived\": ${bytes_received}
        }" 2>/dev/null || true
}

register_client() {
    local session_id="$1"
    local mac_address=$(get_mac_address)
    local ip_address=$(get_ip_address)
    
    log "Registering with server: session=${session_id}, mac=${mac_address}, ip=${ip_address}"
    
    response=$(curl -s -X POST "http://${BOOTAH_SERVER}:${BOOTAH_PORT}/api/multicast/client/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"sessionId\": \"${session_id}\",
            \"macAddress\": \"${mac_address}\",
            \"ipAddress\": \"${ip_address}\",
            \"hostname\": \"$(hostname)\"
        }")
    
    if echo "$response" | grep -q '"success":true'; then
        log "Successfully registered with server"
        echo "$response" | grep -o '"multicastAddress":"[^"]*"' | cut -d'"' -f4
    else
        log "Failed to register: $response"
        return 1
    fi
}

receive_multicast() {
    local session_id="$1"
    local multicast_address="$2"
    local multicast_port="$3"
    local output_file="$4"
    
    log "Starting multicast receiver: ${multicast_address}:${multicast_port}"
    
    if command -v udp-receiver &>/dev/null; then
        log "Using UDPcast udp-receiver"
        udp-receiver \
            --mcast-all-addr "${multicast_address}" \
            --portbase "${multicast_port}" \
            --file "${output_file}" \
            --nokbd \
            --log /var/log/udp-receiver.log &
        RECEIVER_PID=$!
    else
        log "UDPcast not available, using netcat fallback"
        socat -u UDP4-RECVFROM:${multicast_port},ip-add-membership=${multicast_address}:0.0.0.0,fork - > "${output_file}" &
        RECEIVER_PID=$!
    fi
    
    log "Receiver started with PID: $RECEIVER_PID"
    
    local bytes_received=0
    local last_size=0
    
    while kill -0 $RECEIVER_PID 2>/dev/null; do
        if [ -f "${output_file}" ]; then
            bytes_received=$(stat -c%s "${output_file}" 2>/dev/null || echo 0)
            
            if [ "$bytes_received" -gt "$last_size" ]; then
                local progress=$((bytes_received * 100 / (10737418240)))
                [ $progress -gt 100 ] && progress=100
                send_heartbeat "$session_id" "receiving" "$progress" "$bytes_received"
                last_size=$bytes_received
            fi
        fi
        sleep 2
    done
    
    wait $RECEIVER_PID
    log "Receiver finished. Total bytes: $bytes_received"
}

restore_image() {
    local image_file="$1"
    local target_disk="$2"
    
    log "Restoring image to ${target_disk}"
    
    send_heartbeat "$SESSION_ID" "restoring" 50 $(stat -c%s "$image_file")
    
    local ext="${image_file##*.}"
    
    case "$ext" in
        gz|gzip)
            if command -v partclone.restore &>/dev/null; then
                log "Using partclone for restore"
                gunzip -c "$image_file" | partclone.restore -d -o "$target_disk"
            else
                log "Using dd for restore"
                gunzip -c "$image_file" | dd of="$target_disk" bs=4M status=progress
            fi
            ;;
        img|raw)
            log "Using dd for raw image"
            dd if="$image_file" of="$target_disk" bs=4M status=progress
            ;;
        *)
            log "Unknown image format: $ext"
            return 1
            ;;
    esac
    
    sync
    log "Image restore complete"
    send_heartbeat "$SESSION_ID" "completed" 100 $(stat -c%s "$image_file")
}

select_session() {
    log "Fetching available multicast sessions..."
    
    sessions=$(curl -s "http://${BOOTAH_SERVER}:${BOOTAH_PORT}/api/multicast/sessions?status=waiting,active")
    
    if [ -z "$sessions" ] || [ "$sessions" = "[]" ]; then
        log "No active multicast sessions available"
        return 1
    fi
    
    echo "$sessions" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
}

main() {
    log "=========================================="
    log "Bootah Multicast Agent Starting"
    log "Server: ${BOOTAH_SERVER}:${BOOTAH_PORT}"
    log "Mode: ${BOOTAH_MODE}"
    log "Target Disk: ${TARGET_DISK}"
    log "MAC Address: $(get_mac_address)"
    log "IP Address: $(get_ip_address)"
    log "=========================================="
    
    if [ -z "$BOOTAH_SERVER" ]; then
        for param in $(cat /proc/cmdline); do
            case "$param" in
                bootah.server=*) BOOTAH_SERVER="${param#*=}" ;;
                bootah.port=*) BOOTAH_PORT="${param#*=}" ;;
                bootah.mode=*) BOOTAH_MODE="${param#*=}" ;;
                bootah.session=*) SESSION_ID="${param#*=}" ;;
                bootah.disk=*) TARGET_DISK="${param#*=}" ;;
            esac
        done
    fi
    
    if [ -z "$BOOTAH_SERVER" ]; then
        log "ERROR: No server specified. Set BOOTAH_SERVER or use bootah.server= kernel parameter"
        exit 1
    fi
    
    until curl -s "http://${BOOTAH_SERVER}:${BOOTAH_PORT}/api/health" >/dev/null 2>&1; do
        log "Waiting for server connection..."
        sleep 2
    done
    log "Server connection established"
    
    if [ -z "$SESSION_ID" ]; then
        SESSION_ID=$(select_session)
        if [ -z "$SESSION_ID" ]; then
            log "No session available. Entering wait mode..."
            while true; do
                SESSION_ID=$(select_session)
                [ -n "$SESSION_ID" ] && break
                sleep 5
            done
        fi
    fi
    
    log "Joining session: $SESSION_ID"
    
    session_info=$(curl -s "http://${BOOTAH_SERVER}:${BOOTAH_PORT}/api/multicast/sessions/${SESSION_ID}")
    multicast_address=$(echo "$session_info" | grep -o '"multicastAddress":"[^"]*"' | cut -d'"' -f4)
    multicast_port=$(echo "$session_info" | grep -o '"port":[0-9]*' | cut -d':' -f2)
    
    log "Multicast Address: ${multicast_address}:${multicast_port}"
    
    register_client "$SESSION_ID"
    
    IMAGE_FILE="/tmp/bootah-image.img"
    
    receive_multicast "$SESSION_ID" "$multicast_address" "$multicast_port" "$IMAGE_FILE"
    
    restore_image "$IMAGE_FILE" "$TARGET_DISK"
    
    log "Deployment complete! Rebooting in 10 seconds..."
    sleep 10
    reboot
}

main "$@"
