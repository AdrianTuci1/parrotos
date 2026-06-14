#!/bin/bash
# setup-github-secrets.sh - Generate and display all secrets needed for GitHub Actions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔐 GitHub Secrets Setup Guide"
echo "============================="
echo ""

# Check if we're in a git repo
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "❌ Not a git repository. Please run from the project root."
    exit 1
fi

# Get remote URL
REMOTE_URL=$(git -C "$PROJECT_ROOT" remote get-url origin 2>/dev/null || echo "not-set")

echo "Repository: $REMOTE_URL"
echo ""

# Generate secrets
echo "📋 Generating Secrets"
echo "---------------------"

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
echo "✅ JWT_SECRET generated"

# Internal Token
INTERNAL_TOKEN=$(openssl rand -base64 16)
echo "✅ INTERNAL_TOKEN generated"

# Generate SSH key for VPS
VPS_KEY_FILE="$PROJECT_ROOT/vps-key"
if [ ! -f "$VPS_KEY_FILE" ]; then
    ssh-keygen -t ed25519 -a 100 -f "$VPS_KEY_FILE" -N "" -C "github-actions@sentry-data"
    echo "✅ VPS SSH key generated: $VPS_KEY_FILE"
else
    echo "⚠️  VPS SSH key already exists: $VPS_KEY_FILE"
fi

echo ""
echo "📝 Secrets to add to GitHub"
echo "=========================="
echo ""
echo "Go to: GitHub Repository → Settings → Secrets and variables → Actions"
echo ""
echo "Required Secrets:"
echo "-----------------"
echo ""
echo "1. VPS_HOST"
echo "   Value: Your Contabo VPS IP address (e.g., 123.456.789.0)"
echo "   Get from: Contabo dashboard"
echo ""
echo "2. VPS_USER"
echo "   Value: root"
echo "   (or your SSH username)"
echo ""
echo "3. VPS_SSH_KEY"
echo "   Value: (copy the content below)"
echo "   ───────────────────────────────────────"
cat "$VPS_KEY_FILE"
echo "   ───────────────────────────────────────"
echo ""
echo "4. GCP_PROJECT_ID"
echo "   Value: Your GCP project ID (e.g., sentry-data-prod-123)"
echo ""
echo "5. GCP_SA_KEY"
echo "   Value: Content of terraform-sa-key.json (from setup-gcp-project.sh)"
echo "   Generate: cat terraform-sa-key.json | base64"
echo "   Or paste the JSON directly"
echo ""
echo "6. CLOUDFLARE_API_TOKEN"
echo "   Value: (create at https://dash.cloudflare.com/profile/api-tokens)"
echo "   Required permissions:"
echo "     - Zone:Read, Zone:Edit"
echo "     - Page Rules:Edit"
echo "     - Cloudflare Pages:Edit"
echo ""
echo "7. CLOUDFLARE_ZONE_ID"
echo "   Value: (get from Cloudflare dashboard → Domain → Overview)"
echo ""
echo "8. CLOUDFLARE_ACCOUNT_ID"
echo "   Value: (get from Cloudflare dashboard → right sidebar)"
echo ""
echo "9. JWT_SECRET"
echo "   Value: $JWT_SECRET"
echo ""
echo "10. INTERNAL_TOKEN"
echo "    Value: $INTERNAL_TOKEN"
echo ""
echo "11. LLM_API_KEY"
echo "    Value: Your Gemini API key (from https://aistudio.google.com/)"
echo ""
echo "Optional Secrets:"
echo "----------------"
echo ""
echo "12. STRIPE_SECRET_KEY"
echo "    Value: sk_live_... (if using Stripe)"
echo ""
echo "13. STRIPE_WEBHOOK_SECRET"
echo "    Value: whsec_... (if using Stripe)"
echo ""
echo "Variables (not secrets):"
echo "------------------------"
echo ""
echo "14. DOMAIN"
echo "    Value: sentrydata.io (or your domain)"
echo "    Type: Variable (not secret)"
echo ""

# Add VPS public key to display
echo ""
echo "🔑 VPS SSH Public Key"
echo "====================="
echo "Add this to your VPS ~/.ssh/authorized_keys:"
echo "───────────────────────────────────────────"
cat "$VPS_KEY_FILE.pub"
echo "───────────────────────────────────────────"
echo ""
echo "Command to add to VPS:"
echo "  ssh-copy-id -i $VPS_KEY_FILE.pub root@YOUR_VPS_IP"
echo ""

echo ""
echo "✅ Setup Guide Complete!"
echo "========================"
echo ""
echo "Next steps:"
echo "1. Run ./scripts/setup-gcp-project.sh to setup GCP"
echo "2. Add all secrets to GitHub"
echo "3. Run deploy workflow from GitHub Actions"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Keep vps-key and vps-key.pub secure!"
echo "   - Add to .gitignore:"
echo "     echo 'vps-key*' >> .gitignore"
echo "   - Never commit secrets to git!"
