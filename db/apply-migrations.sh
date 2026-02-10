#!/bin/bash

# Database credentials
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="chessonline"
DB_USER="chess"
MIGRATIONS_DIR="$(dirname "$0")/migrations"

echo "🔄 Applying database migrations..."

# Create migrations tracking table if not exists
docker exec -i chess_postgres psql -U $DB_USER -d $DB_NAME << 'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# Get list of already applied migrations
APPLIED_MIGRATIONS=$(docker exec chess_postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT filename FROM schema_migrations ORDER BY filename;")

# Apply new migrations in order
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
        filename=$(basename "$migration_file")
        
        # Check if already applied
        if echo "$APPLIED_MIGRATIONS" | grep -q "$filename"; then
            echo "⏩ Skipping $filename (already applied)"
        else
            echo "📥 Applying migration: $filename"
            
            # Apply migration
            if docker exec -i chess_postgres psql -U $DB_USER -d $DB_NAME < "$migration_file"; then
                # Mark as applied
                docker exec chess_postgres psql -U $DB_USER -d $DB_NAME -c "INSERT INTO schema_migrations (filename) VALUES ('$filename');"
                echo "✅ Successfully applied $filename"
            else
                echo "❌ Failed to apply $filename"
                exit 1
            fi
        fi
    fi
done

echo "✨ All migrations applied successfully!"
