#!/bin/bash

# Database setup script for Family Navigator
# Usage: ./database/setup.sh

set -e

echo "Setting up Family Navigator database..."

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
    echo "Error: PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Default values
DB_NAME="${DB_NAME:-familynavigator}"
DB_USER="${DB_USER:-$USER}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Create database if it doesn't exist
echo "Creating database '$DB_NAME' if it doesn't exist..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || echo "Database '$DB_NAME' already exists"

# Run schema
echo "Running database schema..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/schema.sql"

echo "Database setup completed successfully!"
echo ""
echo "Connection string: postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo "Next steps:"
echo "1. Update server/.env with your database connection string"
echo "2. Run 'npm run dev' to start the application"