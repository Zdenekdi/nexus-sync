#!/bin/bash
# ================================================================================
# setup-gcloud.sh — Google Cloud Platform Environment Setup Script
# ================================================================================
# Tento skript automaticky aktivuje potřebná API, vytvoří sloty v Secret Manageru,
# nastaví IAM práva a vytvoří Artifact Registry repozitář pro projekt Nexus Hub.
#
# Použití:
#   chmod +x setup-gcloud.sh
#   ./setup-gcloud.sh
# ================================================================================

set -e

# 1. Detekce a nastavení GCP projektu
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: Nebyl detekován žádný aktivní gcloud projekt. Nastavte ho pomocí: gcloud config set project [PROJECT_ID]"
  exit 1
fi

echo "================================================================================"
# Získání čísla projektu
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
echo "🚀 Zahajuji konfiguraci pro projekt: $PROJECT_ID ($PROJECT_NUMBER)"
echo "================================================================================"

# 2. Povolení Google Cloud API
echo "🔌 [1/5] Aktivuji potřebná API v Google Cloud..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  testing.googleapis.com \
  toolresults.googleapis.com \
  --quiet

# 3. Vytvoření repozitáře v Artifact Registry (pokud neexistuje)
echo "📦 [2/5] Kontrola a vytvoření Artifact Registry..."
if gcloud artifacts repositories describe nexus-repo --location=europe-west3 &>/dev/null; then
  echo "✓ Repozitář 'nexus-repo' již existuje."
else
  echo "🏗️ Vytvářím Artifact Registry repozitář 'nexus-repo' v europe-west3..."
  gcloud artifacts repositories create nexus-repo \
    --repository-format=docker \
    --location=europe-west3 \
    --description="Nexus Hub Docker repository" \
    --quiet
fi

# 4. Příprava slotů v Secret Manageru
echo "🔑 [3/5] Příprava slotů v Secret Manageru..."
SECRETS=("DATABASE_URL" "DEVICE_SECRET" "FIREBASE_TOKEN")
for SECRET in "${SECRETS[@]}"; do
  if gcloud secrets describe "$SECRET" &>/dev/null; then
    echo "✓ Secret '$SECRET' již existuje."
  else
    echo "🆕 Vytvářím slot '$SECRET' v Secret Manageru..."
    gcloud secrets create "$SECRET" --replication-policy="automatic" --quiet
  fi
done

# 5. Konfigurace IAM Oprávnění pro Cloud Build Service Account
echo "🛡️ [4/5] Nastavuji oprávnění pro Cloud Build servisní účet..."
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# A. Oprávnění číst tajné údaje z Secret Manageru
echo "   - Přidávám roli Secret Manager Secret Accessor..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CB_SA" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet

# B. Oprávnění nasazovat na Cloud Run
echo "   - Přidávám roli Cloud Run Developer..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CB_SA" \
  --role="roles/run.developer" \
  --quiet

# C. Oprávnění spouštět akce pod identitou servisního účtu
echo "   - Přidávám roli Service Account User..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CB_SA" \
  --role="roles/iam.serviceAccountUser" \
  --quiet

# D. Oprávnění spouštět testy ve Firebase Test Lab
echo "   - Přidávám roli Firebase Test Lab Admin..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CB_SA" \
  --role="roles/cloudtestservice.testAdmin" \
  --quiet


# 6. Shrnutí a další kroky
echo "================================================================================"
echo "🎉 HOTOVO! GCP Infrastruktura je plně připravena."
echo "================================================================================"
echo ""
echo "👉 DŮLEŽITÉ DALŠÍ KROKY:"
echo ""
echo "1. Doplňte hodnoty pro vytvořené Secret Manager sloty:"
echo "   Chcete-li nahrát hodnoty, použijte tyto příkazy (nahraďte TEXT za skutečnou hodnotu):"
echo ""
echo "   echo -n \"postgresql://nexus:nexus_prod_2024!@localhost:5432/nexus_prod\" | gcloud secrets versions add DATABASE_URL --data-file=-"
echo "   echo -n \"VAŠE_DEVICE_SECRET_HODNOTA\" | gcloud secrets versions add DEVICE_SECRET --data-file=-"
echo "   echo -n \"VÁŠ_FIREBASE_TOKEN\" | gcloud secrets versions add FIREBASE_TOKEN --data-file=-"
echo ""
echo "2. Pokud ještě nemáte vytvořený GCS Bucket pro ukládání cache k urychlení buildů, vytvořte jej:"
echo "   gsutil mb -l europe-west3 gs://nexus-build-cache-$PROJECT_ID"
echo "   (a doplňte jeho název na konec cloudbuild.yaml do pole _CACHE_BUCKET)"
echo ""
echo "================================================================================"
