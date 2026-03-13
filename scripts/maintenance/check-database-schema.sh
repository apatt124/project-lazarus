#!/bin/bash

# Project Lazarus - Check Database Schema
# This script checks what tables currently exist in the database

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection details
DB_HOST="${DB_HOST}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-lazarus_medical}"
DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"

if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "Error: DB_HOST, DB_USER, and DB_PASSWORD environment variables are required"
    echo "Set them in .env file or export them before running this script"
    exit 1
fi

echo "=========================================="
echo "Project Lazarus - Database Schema Check"
echo "=========================================="
echo ""

# Check current tables
echo "📋 Checking existing tables..."
echo ""

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables 
    WHERE schemaname IN ('public', 'medical')
    ORDER BY schemaname, tablename;
    "

echo ""
echo "📊 Checking for medical schema tables..."
echo ""

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "
    SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'medical' AND table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'medical'
    ORDER BY table_name;
    "

echo ""
echo "📊 Checking for public schema conversation tables..."
echo ""

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "
    SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public' 
    AND table_name IN ('conversations', 'conversation_memory')
    ORDER BY table_name;
    "

echo ""
echo "=========================================="
echo "✓ Schema check complete!"
echo "=========================================="
