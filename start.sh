#!/bin/bash

# Start Python HTTP server on port 8000
echo "Starting Python HTTP server on port 8000..."
python3 -m http.server 8000 &
echo "Server started with PID $!"
echo "Access at http://localhost:8000"
