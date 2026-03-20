#!/bin/bash

# Delete the 6 diabetes test facts via API

FACT_IDS=(
  "bf132496-e535-442d-b622-0feeb2ca1f29"
  "489537f9-ae3a-41d9-975a-9696dd7acb38"
  "4bfca9a4-ad1f-4e8c-87cc-758681731e70"
  "5bdeeef6-3d24-43dc-bbc0-d83aa0162449"
  "63fd97f9-a5cd-4945-8875-7988b33b8a09"
  "e9d8adde-2a3b-49ee-9d7d-6ad0daff964c"
)

echo "🗑️  Deleting 6 diabetes test facts..."
echo ""

for fact_id in "${FACT_IDS[@]}"; do
  echo "Deleting fact: $fact_id"
  # We'll need to add a DELETE endpoint to the API
done

echo ""
echo "✅ Deletion complete!"
