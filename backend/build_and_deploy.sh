#!/bin/bash

echo "🚀 Building and Deploying TES Dashboard Changes..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Stop any local containers
echo "🛑 Stopping local containers..."
docker stop tes-dashboard 2>/dev/null || true
docker rm tes-dashboard 2>/dev/null || true

# Build the new image
echo "🏗️ Building Docker image..."
docker build -t keshxvdayal/tes-dashboard:latest . || {
    echo "❌ Docker build failed!"
    exit 1
}

# Test the image locally first
echo "🧪 Testing image locally..."
docker run -d --name tes-dashboard-test -p 8081:5000 keshxvdayal/tes-dashboard:latest || {
    echo "❌ Local test failed!"
    exit 1
}

# Wait and check if container started successfully
sleep 10
if ! docker ps | grep tes-dashboard-test > /dev/null; then
    echo "❌ Container failed to start. Checking logs..."
    docker logs tes-dashboard-test
    docker rm tes-dashboard-test 2>/dev/null || true
    exit 1
fi

echo "✅ Local test successful!"

# Stop test container
docker stop tes-dashboard-test
docker rm tes-dashboard-test

# Push to Docker Hub (you need to be logged in)
echo "📤 Pushing to Docker Hub..."
echo "ℹ️ Make sure you're logged in with: docker login"
read -p "Continue with push? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker push keshxvdayal/tes-dashboard:latest || {
        echo "❌ Docker push failed! Make sure you're logged in: docker login"
        exit 1
    }
    echo "✅ Image pushed to Docker Hub successfully!"
else
    echo "⏸️ Push cancelled. Image built locally only."
fi

echo ""
echo "🎯 Next Steps:"
echo "1. If you pushed the image, run the Kubernetes deployment:"
echo "   ./deploy-to-k8s.sh"
echo ""
echo "2. Or test locally with:"
echo "   docker run -d --name tes-dashboard -p 8080:5000 keshxvdayal/tes-dashboard:latest"
