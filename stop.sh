#!/bin/bash

# Stop Python HTTP server
echo "Stopping Python HTTP server..."
pkill -f "python3 -m http.server"

if [ $? -eq 0 ]; then
    echo "Server stopped successfully"
else
    echo "No server process found"
fi
