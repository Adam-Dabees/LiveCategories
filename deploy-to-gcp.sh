#!/bin/bash

echo "🚀 Deploying LiveCategories to Google Cloud Platform (FREE)"
echo "=========================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed."
    echo "   Please install it first: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed."
    echo "   Please install it first: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

echo "✅ Required tools are installed"

# Set variables
PROJECT_ID="livecategories-$(date +%s)"
CLUSTER_NAME="livecategories-cluster"
ZONE="us-central1-a"

echo "📝 Setting up project: $PROJECT_ID"

# Create new project
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Create cluster
echo "🏗️  Creating Kubernetes cluster..."
gcloud container clusters create $CLUSTER_NAME \
  --zone=$ZONE \
  --num-nodes=1 \
  --machine-type=e2-micro \
  --disk-size=10GB \
  --preemptible \
  --enable-autoscaling \
  --min-nodes=0 \
  --max-nodes=3 \
  --enable-autorepair \
  --enable-autoupgrade

# Get cluster credentials
echo "🔑 Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

# Build and push Docker images
echo "🐳 Building and pushing Docker images..."

# Build frontend image
echo "Building frontend image..."
docker build -t gcr.io/$PROJECT_ID/livecategories-frontend:latest ./frontend

# Build backend image
echo "Building backend image..."
docker build -t gcr.io/$PROJECT_ID/livecategories-backend:latest ./backend

# Push images to Google Container Registry
echo "Pushing images to registry..."
docker push gcr.io/$PROJECT_ID/livecategories-frontend:latest
docker push gcr.io/$PROJECT_ID/livecategories-backend:latest

# Update Kubernetes manifests with correct image names
echo "📝 Updating Kubernetes manifests..."
sed -i.bak "s|livecategories-frontend:latest|gcr.io/$PROJECT_ID/livecategories-frontend:latest|g" k8s/deployment.yaml
sed -i.bak "s|livecategories-backend:latest|gcr.io/$PROJECT_ID/livecategories-backend:latest|g" k8s/deployment.yaml

# Deploy to Kubernetes
echo "🚀 Deploying to Kubernetes..."

# Deploy everything with one command
kubectl apply -f k8s/deployment.yaml

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n livecategories
kubectl wait --for=condition=available --timeout=300s deployment/redis -n livecategories

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/backend -n livecategories
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n livecategories

# Get external IP
echo "🌐 Getting external IP..."
EXTERNAL_IP=$(kubectl get ingress livecategories-ingress -n livecategories -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -z "$EXTERNAL_IP" ]; then
    echo "⏳ Waiting for external IP to be assigned..."
    sleep 30
    EXTERNAL_IP=$(kubectl get ingress livecategories-ingress -n livecategories -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
fi

# Display results
echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "📊 Project Information:"
echo "   Project ID: $PROJECT_ID"
echo "   Cluster: $CLUSTER_NAME"
echo "   Zone: $ZONE"
echo ""
echo "🌐 Application URLs:"
if [ -n "$EXTERNAL_IP" ]; then
    echo "   Frontend: http://$EXTERNAL_IP"
    echo "   Backend API: http://$EXTERNAL_IP/api"
    echo "   API Health: http://$EXTERNAL_IP/api/health"
    echo "   API Docs: http://$EXTERNAL_IP/api/docs"
else
    echo "   External IP is still being assigned..."
    echo "   Run: kubectl get ingress livecategories-ingress -n livecategories"
fi
echo ""
echo "📊 Monitoring:"
echo "   Prometheus: kubectl port-forward svc/prometheus 9090:9090 -n livecategories"
echo "   Grafana: kubectl port-forward svc/grafana 3000:3000 -n livecategories"
echo ""
echo "🔍 Useful Commands:"
echo "   Check pods: kubectl get pods -n livecategories"
echo "   Check services: kubectl get services -n livecategories"
echo "   View logs: kubectl logs -f deployment/backend -n livecategories"
echo "   Scale app: kubectl scale deployment backend --replicas=3 -n livecategories"
echo ""
echo "🛑 To clean up:"
echo "   kubectl delete namespace livecategories"
echo "   gcloud container clusters delete $CLUSTER_NAME --zone=$ZONE"
echo "   gcloud projects delete $PROJECT_ID"
echo ""
echo "💰 Cost: $0.00 (Free tier)"
echo "🎓 Perfect for school projects!"
