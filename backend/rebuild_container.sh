#!/bin/bash

echo "🔨 Rebuilding TES Dashboard Docker Container..."

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker stop tes-dashboard 2>/dev/null || true
docker rm tes-dashboard 2>/dev/null || true

# Remove old image
echo "🗑️ Removing old image..."
docker rmi keshxvdayal/tes-dashboard:latest 2>/dev/null || true

# Build new image
echo "🏗️ Building new image..."
docker build -t keshxvdayal/tes-dashboard:latest . || {
    echo "❌ Docker build failed!"
    exit 1
}

echo "✅ Container rebuild complete!"
echo ""
echo "🚀 To run the container:"
echo "docker run -d --name tes-dashboard -p 8080:5000 keshxvdayal/tes-dashboard:latest"
echo ""
echo "🔍 To check the logs:"
echo "docker logs -f tes-dashboard"
