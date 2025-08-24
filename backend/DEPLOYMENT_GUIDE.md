# TES Dashboard Deployment Guide

## 🎯 Current Status

✅ **TES Dashboard is successfully running locally on port 5001**
- Access: http://localhost:5001
- Container: `tes-dashboard-container`
- Status: Running and accessible

## 🚀 Local Deployment (Currently Active)

The TES dashboard is already running locally in Docker:

```bash
# Check status
docker ps

# View logs
docker logs tes-dashboard-container

# Access the dashboard
open http://localhost:5001
```

## ☁️ Kubernetes Deployment (Ready for when tunnel is fixed)

### Prerequisites
1. **Fix Cloudflare Tunnel**: The tunnel must route `tesanalytics.com` to your Kubernetes API server
2. **Working kubectl**: Must be able to connect to your cluster

### Quick Deploy
```bash
# Run the deployment script
./deploy-to-k8s.sh
```

### Manual Deploy
```bash
# Set kubeconfig
export KUBECONFIG=$(pwd)/kubeconfig.yaml

# Apply secrets
kubectl apply -f secret.yaml

# Deploy dashboard
kubectl apply -f tes-dashboard-deployment.yaml

# Check status
kubectl get pods -l app=tes-dashboard
kubectl get svc tes-dashboard-service
```

## 🔧 Troubleshooting

### Local Issues
```bash
# Restart container
docker restart tes-dashboard-container

# Rebuild image
docker build -t tes-dashboard .

# Check logs
docker logs tes-dashboard-container
```

### Kubernetes Issues
```bash
# Check pod status
kubectl get pods -l app=tes-dashboard

# View logs
kubectl logs deployment/tes-dashboard

# Describe pod for errors
kubectl describe pod -l app=tes-dashboard
```

## 📁 Files Created

- `tes-dashboard-deployment.yaml` - Kubernetes deployment manifest
- `deploy-to-k8s.sh` - Automated deployment script
- `kubeconfig.yaml` - Updated with tunnel domain
- `secret.yaml` - Environment variables (already existed)

## 🌐 Access Methods

### Local
- **URL**: http://localhost:5001
- **Status**: ✅ Working

### Kubernetes (After tunnel fix)
- **LoadBalancer**: External IP from `kubectl get svc tes-dashboard-service`
- **NodePort**: http://<node-ip>:30080
- **Port Forward**: `kubectl port-forward svc/tes-dashboard-service 8080:80`

## 🔍 Monitoring

```bash
# Local monitoring
docker stats tes-dashboard-container

# Kubernetes monitoring
kubectl top pods -l app=tes-dashboard
kubectl get events --sort-by='.lastTimestamp'
```

## 🛠️ Next Steps

1. **Fix Cloudflare Tunnel** to route `tesanalytics.com` to Kubernetes API
2. **Run deployment script**: `./deploy-to-k8s.sh`
3. **Access dashboard** via the provided service endpoints

---

**Current Status**: ✅ Local deployment successful, Kubernetes deployment ready 