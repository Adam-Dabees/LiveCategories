#!/bin/bash

echo "🚀 Quick Deploy to Free Kubernetes (5 minutes)"
echo "=============================================="

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        echo "   $2"
        exit 1
    fi
}

check_tool "gcloud" "https://cloud.google.com/sdk/docs/install"
check_tool "kubectl" "https://kubernetes.io/docs/tasks/tools/"

echo "✅ All required tools are installed"

# Set variables
PROJECT_ID="livecategories-$(date +%s)"
CLUSTER_NAME="livecategories-cluster"
ZONE="us-central1-a"

echo "📝 Project ID: $PROJECT_ID"

# Create project and enable APIs
echo "🔧 Setting up project..."
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID
gcloud services enable container.googleapis.com compute.googleapis.com

# Create cluster
echo "🏗️  Creating cluster (this may take 2-3 minutes)..."
gcloud container clusters create $CLUSTER_NAME \
  --zone=$ZONE \
  --num-nodes=1 \
  --machine-type=e2-micro \
  --disk-size=10GB \
  --preemptible \
  --enable-autoscaling \
  --min-nodes=0 \
  --max-nodes=3

# Get credentials
echo "🔑 Getting credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

# Deploy application
echo "🚀 Deploying application..."
kubectl apply -f k8s/deployment.yaml

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
kubectl wait --for=condition=available --timeout=300s deployment/backend -n livecategories
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n livecategories

# Get external IP
echo "🌐 Getting external IP..."
EXTERNAL_IP=$(kubectl get ingress livecategories-ingress -n livecategories -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -z "$EXTERNAL_IP" ]; then
    echo "⏳ External IP is being assigned..."
    sleep 30
    EXTERNAL_IP=$(kubectl get ingress livecategories-ingress -n livecategories -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
fi

# Display results
echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "🌐 Your LiveCategories game is now live!"
if [ -n "$EXTERNAL_IP" ]; then
    echo "   URL: http://$EXTERNAL_IP"
    echo "   API: http://$EXTERNAL_IP/api"
    echo "   Health: http://$EXTERNAL_IP/api/health"
else
    echo "   External IP is still being assigned..."
    echo "   Run: kubectl get ingress livecategories-ingress -n livecategories"
fi
echo ""
echo "📊 Check status:"
echo "   kubectl get pods -n livecategories"
echo "   kubectl get services -n livecategories"
echo ""
echo "💰 Cost: $0.00 (Free tier)"
echo "🎓 Perfect for school projects!"
echo ""
echo "🛑 To clean up when done:"
echo "   kubectl delete namespace livecategories"
echo "   gcloud container clusters delete $CLUSTER_NAME --zone=$ZONE"
echo "   gcloud projects delete $PROJECT_ID"
