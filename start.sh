#!/bin/bash

# Stop Python HTTP server
echo "Checking for running Python HTTP servers..."
pkill -f "python3 -m http.server"

if [ $? -eq 0 ]; then
    echo "Server stopped successfully"
else
    echo "No server process found"
fi

# Start Python HTTP server on port 8000
echo "Starting Python HTTP server on port 8000..."
python3 -m http.server 8000 &
echo "Server started with PID $!"
echo "Access at http://localhost:8000"
