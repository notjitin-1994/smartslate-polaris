#!/bin/bash

# Starmaps Master Migration Runner
# This script helps apply the starmaps_master migration to your Supabase database

echo "=================================="
echo "Starmaps Master Migration"
echo "=================================="
echo ""
echo "This script will guide you through applying the starmaps_master migration."
echo ""

# Check if migration file exists
if [ ! -f "starmaps_master_migration.sql" ]; then
    echo "Error: starmaps_master_migration.sql not found!"
    echo "Please ensure you're running this script from the project root."
    exit 1
fi

echo "Migration file found: starmaps_master_migration.sql"
echo ""
echo "To apply this migration:"
echo ""
echo "1. Go to your Supabase Dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Create a new query"
echo "4. Copy and paste the contents of starmaps_master_migration.sql"
echo "5. Run the query"
echo ""
echo "Alternatively, if you have the Supabase CLI installed:"
echo ""
echo "supabase db push --file starmaps_master_migration.sql"
echo ""
echo "To verify the migration:"
echo ""
echo "SELECT * FROM starmaps_master LIMIT 1;"
echo "SELECT * FROM pg_policies WHERE tablename = 'starmaps_master';"
echo "SELECT proname FROM pg_proc WHERE proname LIKE '%starmap%';"
echo ""
echo "=================================="
echo "Next Steps After Migration:"
echo "=================================="
echo ""
echo "1. Navigate to http://localhost:3000/discover"
echo "2. Click 'Create New Starmap' to test the new flow"
echo "3. Check the database to verify data is being saved"
echo ""
echo "For any issues, refer to STARMAPS_MASTER_README.md"
