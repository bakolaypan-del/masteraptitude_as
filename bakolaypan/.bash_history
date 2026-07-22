gcloud firestore export gs://masteraptitude-migration-temp --database="ai-studio-a04eec93-77d7-4d06-a729-9d2c233ce685"
gcloud firestore export gs://masteraptitude --database="ai-studio-a04eec93-77d7-4d06-a729-9d2c233ce685"
gcloud storage cp --recursive   "gs://masteraptitude/2026-07-21T06:33:16_83174"   .
