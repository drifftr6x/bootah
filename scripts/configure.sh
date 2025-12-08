#!/bin/bash
#
# Bootah - Configuration Wizard
# Interactive configuration script for updating Bootah settings
#
# Usage: ./configure.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Find installation directory
find_install_dir() {
    if [ -f ".env" ]; then
        INSTALL_DIR="$(pwd)"
    elif [ -f "$HOME/bootah/.env" ]; then
        INSTALL_DIR="$HOME/bootah"
    elif [ -f "/opt/bootah/.env" ]; then
        INSTALL_DIR="/opt/bootah"
    else
        echo -e "${RED}Error: Cannot find Bootah installation.${NC}"
        echo "Please run this script from the Bootah installation directory."
        exit 1
    fi
    cd "$INSTALL_DIR"
}

# Load current configuration
load_config() {
    if [ -f ".env" ]; then
        set -a
        source .env
        set +a
    fi
}

# Generate secure random string
generate_secret() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 32
    else
        head -c 32 /dev/urandom | base64
    fi
}

# Get current value or default
get_current() {
    local var_name=$1
    local default=$2
    local current="${!var_name}"
    echo "${current:-$default}"
}

# Print header
print_header() {
    clear
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║              Bootah Configuration Wizard                  ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Print menu
print_menu() {
    echo -e "${CYAN}Current Configuration:${NC}"
    echo "─────────────────────────────────────────────────────────────"
    echo ""
    echo "  1) Server Settings"
    echo "     Port: $(get_current PORT 5000)"
    echo "     PXE Server IP: $(get_current PXE_SERVER_IP "not set")"
    echo ""
    echo "  2) Authentication Settings"
    echo "     Mode: $(get_current AUTH_MODE replit)"
    echo "     Registration: $(get_current ALLOW_REGISTRATION true)"
    echo "     Default Role: $(get_current DEFAULT_USER_ROLE viewer)"
    echo ""
    echo "  3) Email Settings"
    echo "     Provider: $(get_current EMAIL_PROVIDER console)"
    echo "     From: $(get_current EMAIL_FROM "not set")"
    echo ""
    echo "  4) Database Settings"
    echo "     URL: ${DATABASE_URL:0:40}..."
    echo ""
    echo "  5) Regenerate Session Secret"
    echo ""
    echo "  6) View Full Configuration"
    echo ""
    echo "  7) Test Email Configuration"
    echo ""
    echo "  0) Save and Exit"
    echo ""
    echo "─────────────────────────────────────────────────────────────"
}

# Configure server settings
configure_server() {
    echo ""
    echo -e "${CYAN}Server Settings${NC}"
    echo "─────────────────────────────────────────────────────────────"
    
    read -p "Web interface port [$(get_current PORT 5000)]: " input
    [ -n "$input" ] && PORT="$input"
    
    read -p "PXE Server IP [$(get_current PXE_SERVER_IP "auto")]: " input
    [ -n "$input" ] && PXE_SERVER_IP="$input"
    
    read -p "TFTP Port [$(get_current TFTP_PORT 6969)]: " input
    [ -n "$input" ] && TFTP_PORT="$input"
    
    read -p "DHCP Port [$(get_current DHCP_PORT 4067)]: " input
    [ -n "$input" ] && DHCP_PORT="$input"
    
    echo ""
    echo -e "${GREEN}Server settings updated.${NC}"
    read -p "Press Enter to continue..."
}

# Configure authentication
configure_auth() {
    echo ""
    echo -e "${CYAN}Authentication Settings${NC}"
    echo "─────────────────────────────────────────────────────────────"
    
    echo "Authentication mode:"
    echo "  1) local - Username/password (for self-hosted)"
    echo "  2) replit - OAuth via Replit"
    read -p "Select mode [$(get_current AUTH_MODE local)]: " input
    case "$input" in
        1|local) AUTH_MODE="local" ;;
        2|replit) AUTH_MODE="replit" ;;
    esac
    
    read -p "Allow user registration? (true/false) [$(get_current ALLOW_REGISTRATION true)]: " input
    [ -n "$input" ] && ALLOW_REGISTRATION="$input"
    
    echo "Default role for new users:"
    echo "  1) viewer - Read-only access"
    echo "  2) operator - Can manage deployments"
    echo "  3) admin - Full access"
    read -p "Select role [$(get_current DEFAULT_USER_ROLE viewer)]: " input
    case "$input" in
        1|viewer) DEFAULT_USER_ROLE="viewer" ;;
        2|operator) DEFAULT_USER_ROLE="operator" ;;
        3|admin) DEFAULT_USER_ROLE="admin" ;;
    esac
    
    echo ""
    echo -e "${GREEN}Authentication settings updated.${NC}"
    read -p "Press Enter to continue..."
}

# Configure email
configure_email() {
    echo ""
    echo -e "${CYAN}Email Settings${NC}"
    echo "─────────────────────────────────────────────────────────────"
    
    echo "Email provider:"
    echo "  1) console - Log emails to console (development)"
    echo "  2) smtp - Use SMTP server"
    echo "  3) sendgrid - Use SendGrid API"
    read -p "Select provider [$(get_current EMAIL_PROVIDER console)]: " input
    case "$input" in
        1|console) EMAIL_PROVIDER="console" ;;
        2|smtp) 
            EMAIL_PROVIDER="smtp"
            read -p "SMTP Host [$(get_current SMTP_HOST)]: " input
            [ -n "$input" ] && SMTP_HOST="$input"
            read -p "SMTP Port [$(get_current SMTP_PORT 587)]: " input
            [ -n "$input" ] && SMTP_PORT="$input"
            read -p "SMTP User [$(get_current SMTP_USER)]: " input
            [ -n "$input" ] && SMTP_USER="$input"
            read -sp "SMTP Password: " input
            echo ""
            [ -n "$input" ] && SMTP_PASS="$input"
            ;;
        3|sendgrid)
            EMAIL_PROVIDER="sendgrid"
            read -sp "SendGrid API Key: " input
            echo ""
            [ -n "$input" ] && SENDGRID_API_KEY="$input"
            ;;
    esac
    
    if [ "$EMAIL_PROVIDER" != "console" ]; then
        read -p "From email address [$(get_current EMAIL_FROM)]: " input
        [ -n "$input" ] && EMAIL_FROM="$input"
        
        read -p "Application URL [$(get_current APP_URL)]: " input
        [ -n "$input" ] && APP_URL="$input"
    fi
    
    echo ""
    echo -e "${GREEN}Email settings updated.${NC}"
    read -p "Press Enter to continue..."
}

# Regenerate session secret
regenerate_secret() {
    echo ""
    echo -e "${YELLOW}Warning: Regenerating the session secret will log out all users.${NC}"
    read -p "Continue? (y/n): " confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        SESSION_SECRET=$(generate_secret)
        echo -e "${GREEN}Session secret regenerated.${NC}"
    else
        echo "Cancelled."
    fi
    read -p "Press Enter to continue..."
}

# View full configuration
view_config() {
    echo ""
    echo -e "${CYAN}Full Configuration${NC}"
    echo "─────────────────────────────────────────────────────────────"
    cat .env
    echo "─────────────────────────────────────────────────────────────"
    read -p "Press Enter to continue..."
}

# Test email configuration
test_email() {
    echo ""
    echo -e "${CYAN}Testing Email Configuration${NC}"
    echo "─────────────────────────────────────────────────────────────"
    
    # First check the email status
    echo "Checking email configuration..."
    status=$(curl -s "http://localhost:${PORT:-5000}/api/auth/email-status" 2>/dev/null)
    
    if [ -z "$status" ]; then
        echo -e "${RED}Error: Cannot connect to Bootah server.${NC}"
        echo "Make sure Bootah is running on port ${PORT:-5000}."
        echo ""
        read -p "Press Enter to continue..."
        return
    fi
    
    echo "Email Status: $status"
    echo ""
    
    provider=$(echo "$status" | grep -o '"provider":"[^"]*"' | cut -d'"' -f4)
    configured=$(echo "$status" | grep -o '"configured":true')
    
    if [ "$provider" = "console" ]; then
        echo -e "${YELLOW}Email is in console mode.${NC}"
        echo "Emails will be logged to the server console instead of being sent."
        echo ""
        echo "To enable real email delivery:"
        echo "  1. Run this configuration wizard and select option 3 (Email Settings)"
        echo "  2. Choose SMTP or SendGrid as your provider"
        echo "  3. Enter your email server credentials"
        echo "  4. Save and restart Bootah"
    elif [ -n "$configured" ]; then
        echo -e "${GREEN}Email provider '$provider' is configured and ready.${NC}"
        echo ""
        echo "To test email delivery:"
        echo "  1. Open the Bootah web interface"
        echo "  2. Go to the login page"
        echo "  3. Click 'Forgot Password'"
        echo "  4. Enter a test email address"
        echo "  5. Check your inbox for the password reset email"
        echo ""
        echo "If the email arrives, your configuration is working correctly!"
    else
        echo -e "${YELLOW}Email provider '$provider' is not fully configured.${NC}"
        echo "Please check your email settings in option 3."
    fi
    
    echo ""
    read -p "Press Enter to continue..."
}

# Save configuration
save_config() {
    echo ""
    echo "Saving configuration..."
    
    # Backup existing config
    cp .env .env.backup.$(date +%Y%m%d%H%M%S)
    
    # Write new config
    cat > .env << EOF
# Bootah Environment Configuration
# Updated on $(date)

NODE_ENV=${NODE_ENV:-production}
PORT=${PORT:-5000}
HOST=${HOST:-0.0.0.0}

DATABASE_URL=$DATABASE_URL

AUTH_MODE=${AUTH_MODE:-local}
SESSION_SECRET=$SESSION_SECRET
ALLOW_REGISTRATION=${ALLOW_REGISTRATION:-true}
DEFAULT_USER_ROLE=${DEFAULT_USER_ROLE:-viewer}

PXE_SERVER_IP=${PXE_SERVER_IP:-192.168.1.50}
TFTP_PORT=${TFTP_PORT:-6969}
DHCP_PORT=${DHCP_PORT:-4067}

EMAIL_PROVIDER=${EMAIL_PROVIDER:-console}
EOF

    if [ "$EMAIL_PROVIDER" = "smtp" ]; then
        cat >> .env << EOF
SMTP_HOST=$SMTP_HOST
SMTP_PORT=${SMTP_PORT:-587}
SMTP_SECURE=${SMTP_SECURE:-false}
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
EMAIL_FROM=$EMAIL_FROM
APP_URL=$APP_URL
EOF
    elif [ "$EMAIL_PROVIDER" = "sendgrid" ]; then
        cat >> .env << EOF
SENDGRID_API_KEY=$SENDGRID_API_KEY
EMAIL_FROM=$EMAIL_FROM
APP_URL=$APP_URL
EOF
    fi
    
    echo -e "${GREEN}Configuration saved!${NC}"
    echo ""
    echo "To apply changes, restart Bootah:"
    echo "  Docker: docker-compose restart"
    echo "  Linux: sudo systemctl restart bootah"
}

# Main loop
main() {
    find_install_dir
    load_config
    
    while true; do
        print_header
        print_menu
        
        read -p "Select option: " choice
        
        case "$choice" in
            1) configure_server ;;
            2) configure_auth ;;
            3) configure_email ;;
            4) echo "Database configuration should be done manually for safety." 
               read -p "Press Enter to continue..." ;;
            5) regenerate_secret ;;
            6) view_config ;;
            7) test_email ;;
            0) save_config; exit 0 ;;
            *) echo "Invalid option" ;;
        esac
    done
}

# Run main
main
