#!/bin/bash

echo "🚀 TES Dashboard Kubernetes Deployment Script"
echo "=============================================="

# Function to test tunnel connectivity
test_tunnel() {
    echo "🔍 Testing tunnel connectivity..."
    
    # Test if tesanalytics.com responds with Kubernetes API
    if curl -k -s https://tesanalytics.com/version | grep -q "major\|minor\|gitVersion"; then
        echo "✅ Tunnel is working - Kubernetes API accessible"
        return 0
    else
        echo "❌ Tunnel is not routing to Kubernetes API"
        echo "   Current response shows: $(curl -k -s https://tesanalytics.com/version | head -1)"
        return 1
    fi
}

# Function to deploy to Kubernetes
deploy_to_k8s() {
    echo "📦 Deploying to Kubernetes..."
    
    # Set kubeconfig
    export KUBECONFIG=$(pwd)/kubeconfig-tunnel.yaml
    
    # Test connection
    if ! kubectl get nodes > /dev/null 2>&1; then
        echo "❌ Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    echo "✅ Connected to Kubernetes cluster"
    
    # Apply secrets
    echo "🔐 Applying secrets..."
    kubectl apply -f secret.yaml
    
    # Apply deployment
    echo "📦 Applying deployment..."
    kubectl apply -f tes-dashboard-deployment.yaml
    
    # Wait for deployment
    echo "⏳ Waiting for deployment to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/tes-dashboard
    
    # Show services
    echo "🌐 Service Information:"
    kubectl get svc -l app=tes-dashboard
    
    return 0
}

# Function to create local port forward
create_port_forward() {
    echo "🔌 Creating local port forward..."
    
    # Kill any existing port forwards
    pkill -f "kubectl port-forward" 2>/dev/null || true
    
    # Start port forward in background
    kubectl port-forward svc/tes-dashboard-service 8080:80 &
    PF_PID=$!
    
    # Wait a moment for port forward to start
    sleep 3
    
    if kill -0 $PF_PID 2>/dev/null; then
        echo "✅ Port forward created: http://localhost:8080"
        echo "   PID: $PF_PID (use 'kill $PF_PID' to stop)"
        return 0
    else
        echo "❌ Failed to create port forward"
        return 1
    fi
}

# Main deployment logic
main() {
    echo ""
    echo "🔧 Deployment Options:"
    echo "1. Test tunnel and deploy to Kubernetes"
    echo "2. Deploy to Kubernetes (skip tunnel test)"
    echo "3. Create local port forward only"
    echo "4. Show deployment status"
    echo "5. Exit"
    echo ""
    read -p "Choose option (1-5): " choice
    
    case $choice in
        1)
            if test_tunnel; then
                deploy_to_k8s
                if [ $? -eq 0 ]; then
                    create_port_forward
                fi
            else
                echo ""
                echo "🔧 Tunnel Fix Instructions:"
                echo "1. Edit your Cloudflare tunnel config (~/.cloudflared/config.yml):"
                echo "   ingress:"
                echo "     - hostname: tesanalytics.com"
                echo "       service: https://192.168.140.150:6443"
                echo "       originRequest:"
                echo "         noTLSVerify: true"
                echo "     - service: http_status:404"
                echo ""
                echo "2. Restart the tunnel:"
                echo "   cloudflared tunnel run --token <your-token> my-k8s-tunnel"
                echo ""
                echo "3. Run this script again"
            fi
            ;;
        2)
            deploy_to_k8s
            if [ $? -eq 0 ]; then
                create_port_forward
            fi
            ;;
        3)
            export KUBECONFIG=$(pwd)/kubeconfig-tunnel.yaml
            create_port_forward
            ;;
        4)
            export KUBECONFIG=$(pwd)/kubeconfig-tunnel.yaml
            echo "📊 Deployment Status:"
            kubectl get pods -l app=tes-dashboard
            kubectl get svc -l app=tes-dashboard
            ;;
        5)
            echo "👋 Exiting..."
            exit 0
            ;;
        *)
            echo "❌ Invalid option"
            main
            ;;
    esac
}

# Run main function
main 