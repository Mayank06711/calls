#!/bin/bash

ENV=$1
NGINX_BASE_DIR="C:/Users/mayan/Desktop/AWS-NOTES/VeryPersonal/calls/server/nginx"
NGINX_SYSTEM_DIR="/etc/nginx"

# Function to setup Windows/WSL paths
setup_windows() {
    # Create necessary directories
    mkdir -p "${NGINX_SYSTEM_DIR}/sites-available"
    mkdir -p "${NGINX_SYSTEM_DIR}/sites-enabled"

    # Copy the main nginx.conf
    cp "${NGINX_BASE_DIR}/nginx.conf" "${NGINX_SYSTEM_DIR}/nginx.conf"

    if [ "$ENV" = "local" ]; then
        cp "${NGINX_BASE_DIR}/sites-available/local.conf" "${NGINX_SYSTEM_DIR}/sites-available/"
        ln -sf "${NGINX_SYSTEM_DIR}/sites-available/local.conf" "${NGINX_SYSTEM_DIR}/sites-enabled/default"
    elif [ "$ENV" = "production" ]; then
        cp "${NGINX_BASE_DIR}/sites-available/production.conf" "${NGINX_SYSTEM_DIR}/sites-available/"
        ln -sf "${NGINX_SYSTEM_DIR}/sites-available/production.conf" "${NGINX_SYSTEM_DIR}/sites-enabled/default"
    fi
}

# Function to setup Linux/EC2 paths
setup_linux() {
    if [ "$ENV" = "local" ]; then
        sudo cp "${NGINX_BASE_DIR}/sites-available/local.conf" "${NGINX_SYSTEM_DIR}/sites-available/"
        sudo ln -sf "${NGINX_SYSTEM_DIR}/sites-available/local.conf" "${NGINX_SYSTEM_DIR}/sites-enabled/default"
    elif [ "$ENV" = "production" ]; then
        sudo cp "${NGINX_BASE_DIR}/sites-available/production.conf" "${NGINX_SYSTEM_DIR}/sites-available/"
        sudo ln -sf "${NGINX_SYSTEM_DIR}/sites-available/production.conf" "${NGINX_SYSTEM_DIR}/sites-enabled/default"
    fi
}

# Check environment argument
if [ -z "$ENV" ]; then
    echo "Please specify environment: local or production"
    exit 1
fi

# Detect OS and run appropriate setup
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    setup_windows
else
    setup_linux
fi

# Test NGINX configuration
nginx -t

# Reload NGINX if test passes
if [ $? -eq 0 ]; then
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        nginx -s reload
    else
        sudo systemctl reload nginx
    fi
    echo "NGINX configuration updated for $ENV environment"
else
    echo "NGINX configuration test failed"
    exit 1
fi