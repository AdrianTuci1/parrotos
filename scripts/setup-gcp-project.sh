#!/bin/bash
# setup-gcp-project.sh - Setup initial GCP project for Terraform
# Run this ONCE before first deploy

set -e

echo "🚀 GCP Project Setup for Sentry Data Platform"
echo "=============================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in
echo "🔍 Checking gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "❌ Not logged in to gcloud. Running 'gcloud auth login'..."
    gcloud auth login
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
echo "✅ Logged in as: $ACTIVE_ACCOUNT"

# Get or create project
echo ""
echo "📦 Project Setup"
echo "----------------"
read -p "Enter GCP Project ID (or 'new' to create): " PROJECT_ID

if [ "$PROJECT_ID" = "new" ]; then
    read -p "Enter new Project ID (e.g., sentry-data-prod-123): " PROJECT_ID
    read -p "Enter Project Name (e.g., Sentry Data Production): " PROJECT_NAME
    
    echo "Creating project $PROJECT_ID..."
    gcloud projects create $PROJECT_ID --name="$PROJECT_NAME"
    echo "✅ Project created"
    
    # Link billing
    echo ""
    echo "💳 Billing Setup"
    echo "----------------"
    echo "Available billing accounts:"
    gcloud billing accounts list --format="table[box,title='Billing Accounts'](displayName:label='Name',name:label='ID',open:label='Open')"
    
    read -p "Enter Billing Account ID (e.g., 012345-678901-234567): " BILLING_ID
    gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ID
    echo "✅ Billing linked"
else
    # Verify project exists
    if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
        echo "❌ Project $PROJECT_ID does not exist or you don't have access"
        exit 1
    fi
    echo "✅ Using existing project: $PROJECT_ID"
fi

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo ""
echo "🔧 Enabling APIs..."
echo "-------------------"
APIS=(
    "cloudresourcemanager.googleapis.com"
    "serviceusage.googleapis.com"
    "iam.googleapis.com"
    "firestore.googleapis.com"
    "bigquery.googleapis.com"
    "storage.googleapis.com"
    "storage-component.googleapis.com"
    "secretmanager.googleapis.com"
    "run.googleapis.com"
    "cloudscheduler.googleapis.com"
    "pubsub.googleapis.com"
    "cloudbuild.googleapis.com"
    "logging.googleapis.com"
    "monitoring.googleapis.com"
    "bigquerydatatransfer.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo "  Enabling $api..."
    gcloud services enable $api --async
done

echo "✅ APIs enabled (may take a few minutes to propagate)"

# Create Terraform service account
echo ""
echo "👤 Creating Terraform Service Account"
echo "-------------------------------------"
TF_SA_NAME="terraform-admin"
TF_SA_EMAIL="$TF_SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Check if exists
if gcloud iam service-accounts describe $TF_SA_EMAIL &> /dev/null; then
    echo "✅ Service account already exists: $TF_SA_EMAIL"
else
    gcloud iam service-accounts create $TF_SA_NAME \
        --display-name="Terraform Admin" \
        --description="Service account for Terraform infrastructure management"
    echo "✅ Service account created: $TF_SA_EMAIL"
fi

# Grant owner role (needed for Terraform to create everything)
echo ""
echo "🔑 Granting Permissions"
echo "-----------------------"
echo "  Adding roles/owner to Terraform service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$TF_SA_EMAIL" \
    --role="roles/owner"

echo "✅ Owner role granted"

# Create and download key
echo ""
echo "📥 Creating Service Account Key"
echo "------------------------------"
KEY_FILE="terraform-sa-key.json"

if [ -f "$KEY_FILE" ]; then
    echo "⚠️  Key file already exists: $KEY_FILE"
    read -p "Overwrite? (y/n): " OVERWRITE
    if [ "$OVERWRITE" = "y" ]; then
        gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$TF_SA_EMAIL
        echo "✅ New key created: $KEY_FILE"
    fi
else
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$TF_SA_EMAIL
    echo "✅ Key created: $KEY_FILE"
fi

# Create GCS bucket for Terraform state
echo ""
echo "📦 Creating Terraform State Bucket"
echo "----------------------------------"
STATE_BUCKET="sentry-terraform-state-$PROJECT_ID"

if gsutil ls -b "gs://$STATE_BUCKET" &> /dev/null; then
    echo "✅ State bucket already exists: gs://$STATE_BUCKET"
else
    gsutil mb -l EU "gs://$STATE_BUCKET"
    gsutil versioning set on "gs://$STATE_BUCKET"
    echo "✅ State bucket created: gs://$STATE_BUCKET"
fi

# Summary
echo ""
echo "🎉 SETUP COMPLETE!"
echo "=================="
echo ""
echo "Project ID: $PROJECT_ID"
echo "Terraform SA: $TF_SA_EMAIL"
echo "Key File: $KEY_FILE"
echo "State Bucket: gs://$STATE_BUCKET"
echo ""
echo "Next steps:"
echo "1. Add the key file content to GitHub Secret: GCP_SA_KEY"
echo "   cat $KEY_FILE | base64"
echo ""
echo "2. Add to GitHub Secrets:"
echo "   GCP_PROJECT_ID = $PROJECT_ID"
echo "   GCP_SA_KEY = <content of $KEY_FILE>"
echo ""
echo "3. Run the deploy workflow from GitHub Actions"
echo ""
echo "⚠️  IMPORTANT: Keep $KEY_FILE secure! Do not commit it to git!"
echo "   Add to .gitignore:"
echo "   echo '*.json' >> .gitignore"
