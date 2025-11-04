#!/bin/bash

# TES Dashboard Startup Script
echo "🚀 Starting TES Dashboard Integration"

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Start Backend
echo "📡 Starting Backend Server..."
if check_port 5000; then
    cd backend && python3 main.py &
    BACKEND_PID=$!
    echo "✅ Backend started on port 5000 (PID: $BACKEND_PID)"
else
    echo "🔍 Backend might already be running on port 5000"
fi

# Wait a moment for backend to start
sleep 2

# Start Frontend
echo "🎨 Starting Frontend Server..."
if check_port 5173; then
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ Frontend started on port 5173 (PID: $FRONTEND_PID)"
else
    echo "🔍 Frontend might already be running on port 5173"
fi

echo ""
echo "🎉 TES Dashboard is ready!"
echo "📊 Dashboard: http://localhost:5173/federated-analytics-showcase"
echo "🔧 Backend API: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✅ Backend stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✅ Frontend stopped"
    fi
    exit 0
}

# Set up signal handling
trap cleanup INT TERM

# Wait for user interruption
wait
