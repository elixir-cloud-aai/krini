#!/bin/bash

echo "🚀 Deploying TES Dashboard to Kubernetes..."

# Set kubeconfig
export KUBECONFIG=$(pwd)/kubeconfig.yaml

# Check if kubectl can connect
echo "📡 Testing cluster connectivity..."
if ! kubectl get nodes > /dev/null 2>&1; then
    echo "❌ Cannot connect to Kubernetes cluster. Please fix the Cloudflare tunnel first."
    echo "   The tunnel should route tesanalytics.com to your Kubernetes API server."
    exit 1
fi

echo "✅ Connected to Kubernetes cluster"

# Apply the secret
echo "🔐 Applying secrets..."
kubectl apply -f secret.yaml

# Apply the deployment
echo "📦 Deploying TES Dashboard..."
kubectl apply -f tes-dashboard-deployment.yaml

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/tes-dashboard

# Get service information
echo "🌐 Service Information:"
echo "========================"
kubectl get svc tes-dashboard-service
kubectl get svc tes-dashboard-nodeport

echo ""
echo "🎉 TES Dashboard deployed successfully!"
echo ""
echo "📋 Access Information:"
echo "   - LoadBalancer: Check 'kubectl get svc tes-dashboard-service' for external IP"
echo "   - NodePort: Access via http://<node-ip>:30080"
echo ""
echo "🔍 Useful commands:"
echo "   - View logs: kubectl logs deployment/tes-dashboard"
echo "   - Check status: kubectl get pods -l app=tes-dashboard"
echo "   - Port forward: kubectl port-forward svc/tes-dashboard-service 8080:80" 