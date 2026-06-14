#!/bin/bash
# deploy.sh - One-click deploy to production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-prod}"

echo "🚀 Sentry Data Platform - Deploy Script"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo ""

# Check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform is required but not installed."; exit 1; }
    command -v gcloud >/dev/null 2>&1 || { echo "❌ gcloud CLI is required but not installed."; exit 1; }
    command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
    
    echo "✅ All prerequisites met"
}

# Setup GCP project
setup_gcp() {
    echo ""
    echo "📦 Setting up GCP project..."
    
    cd "$PROJECT_ROOT/terraform"
    
    # Initialize Terraform
    echo "  Initializing Terraform..."
    terraform init
    
    # Plan
    echo "  Planning infrastructure..."
    terraform plan -out=tfplan
    
    # Apply
    echo "  Creating infrastructure..."
    terraform apply tfplan
    
    echo "✅ GCP infrastructure ready"
}

# Build and push Docker images
build_images() {
    echo ""
    echo "🐳 Building Docker images..."
    
    PROJECT_ID=$(terraform -chdir="$PROJECT_ROOT/terraform" output -raw project_id)
    
    # Backend
    echo "  Building backend..."
    cd "$PROJECT_ROOT/backend"
    docker build -t "gcr.io/$PROJECT_ID/sentry-backend:latest" .
    docker push "gcr.io/$PROJECT_ID/sentry-backend:latest"
    
    # Chat
    echo "  Building chat service..."
    cd "$PROJECT_ROOT/services/chat"
    docker build -t "gcr.io/$PROJECT_ID/sentry-chat:latest" .
    docker push "gcr.io/$PROJECT_ID/sentry-chat:latest"
    
    # Harness
    echo "  Building harness service..."
    cd "$PROJECT_ROOT/services/harness"
    docker build -t "gcr.io/$PROJECT_ID/sentry-harness:latest" .
    docker push "gcr.io/$PROJECT_ID/sentry-harness:latest"

    echo "  Building observer service..."
    cd "$PROJECT_ROOT/services/observer"
    docker build -t "gcr.io/$PROJECT_ID/sentry-observer:latest" .
    docker push "gcr.io/$PROJECT_ID/sentry-observer:latest"
    
    echo "✅ Docker images built and pushed"
}

# Deploy Cloud Run services
deploy_services() {
    echo ""
    echo "☁️  Deploying Cloud Run services..."
    
    cd "$PROJECT_ROOT/terraform"
    
    # Trigger redeploy
    terraform apply -auto-approve
    
    echo "✅ Services deployed"
}

# Deploy frontend to Cloudflare Pages
deploy_frontend() {
    echo ""
    echo "🌐 Deploying frontend to Cloudflare Pages..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Build
    echo "  Building frontend..."
    npm ci
    npm run build
    
    # Deploy to Cloudflare Pages (using wrangler)
    echo "  Deploying to Cloudflare..."
    npx wrangler pages deploy dist --project-name=sentry-frontend
    
    echo "✅ Frontend deployed"
}

# Health checks
health_checks() {
    echo ""
    echo "🏥 Running health checks..."
    
    BACKEND_URL=$(terraform -chdir="$PROJECT_ROOT/terraform" output -raw backend_url)
    
    # Check backend
    echo "  Checking backend..."
    curl -sf "$BACKEND_URL/api/v1/health" || { echo "❌ Backend health check failed"; exit 1; }
    
    # Check readiness
    echo "  Checking readiness..."
    curl -sf "$BACKEND_URL/api/v1/health/ready" || { echo "❌ Backend readiness check failed"; exit 1; }
    
    echo "✅ All health checks passed"
}

# Output results
show_results() {
    echo ""
    echo "🎉 DEPLOY COMPLETE!"
    echo "===================="
    echo ""
    
    cd "$PROJECT_ROOT/terraform"
    
    echo "URLs:"
    echo "  API:      $(terraform output -raw backend_url)"
    echo "  Frontend: $(terraform output -raw frontend_url)"
    echo "  Chat:     $(terraform output -raw chat_service_url)"
    echo "  Harness:  $(terraform output -raw harness_service_url)"
    echo ""
    echo "Resources:"
    echo "  GCS Bucket:      $(terraform output -raw gcs_bucket)"
    echo "  BigQuery:        $(terraform output -raw bigquery_dataset)"
    echo ""
    echo "Service Accounts:"
    terraform output -json service_accounts | jq -r 'to_entries[] | "  \(.key): \(.value)"'
    echo ""
}

# Destroy everything
destroy() {
    echo ""
    echo "💥 DESTROYING ALL RESOURCES"
    echo "=========================="
    echo "⚠️  This will delete ALL resources including data!"
    read -p "Are you sure? Type 'destroy' to confirm: " confirm
    
    if [ "$confirm" != "destroy" ]; then
        echo "Cancelled."
        exit 0
    fi
    
    cd "$PROJECT_ROOT/terraform"
    terraform destroy -auto-approve
    
    echo ""
    echo "✅ All resources destroyed"
}

# Main
main() {
    case "${2:-deploy}" in
        deploy)
            check_prerequisites
            setup_gcp
            build_images
            deploy_services
            deploy_frontend
            health_checks
            show_results
            ;;
        destroy)
            destroy
            ;;
        setup)
            check_prerequisites
            setup_gcp
            ;;
        build)
            check_prerequisites
            build_images
            ;;
        frontend)
            deploy_frontend
            ;;
        *)
            echo "Usage: $0 [environment] [command]"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full deploy (default)"
            echo "  destroy  - Destroy all resources"
            echo "  setup    - Setup GCP infrastructure only"
            echo "  build    - Build Docker images only"
            echo "  frontend - Deploy frontend only"
            echo ""
            echo "Examples:"
            echo "  $0 prod deploy    # Full deploy to production"
            echo "  $0 prod destroy   # Destroy production"
            exit 1
            ;;
    esac
}

main "$@"
