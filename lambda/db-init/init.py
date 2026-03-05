"""
Project Lazarus - Database Initialization Lambda
One-time function to initialize PostgreSQL with pgvector
"""

import os
import boto3
import psycopg2

secrets_client = boto3.client('secretsmanager')

DB_ENDPOINT = os.environ['DB_ENDPOINT']
DB_NAME = os.environ.get('DB_NAME', 'postgres')
DB_USER = os.environ.get('DB_USER', 'lazarus_admin')


def lambda_handler(event, context):
    """Initialize database with pgvector and schema"""
    
    try:
        # Get password from Secrets Manager
        secret = secrets_client.get_secret_value(SecretId='lazarus/db-password')
        db_password = secret['SecretString']
        
        # Connect to database
        conn = psycopg2.connect(
            host=DB_ENDPOINT,
            database=DB_NAME,
            user=DB_USER,
            password=db_password
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("Connected to database")
        
        # Enable pgvector extension
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        print("✓ pgvector extension enabled")
        
        # Create schema
        cursor.execute("CREATE SCHEMA IF NOT EXISTS medical;")
        print("✓ Medical schema created")
        
        # Create documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS medical.documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                s3_key TEXT NOT NULL,
                document_type VARCHAR(50),
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                content_text TEXT,
                embedding vector(1024),
                metadata JSONB,
                visit_id UUID,
                provider_id UUID
            );
        """)
        print("✓ Documents table created")
        
        # Create vector index
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS documents_embedding_idx 
            ON medical.documents USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        """)
        print("✓ Vector index created")
        
        # Create providers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS medical.providers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                specialty VARCHAR(100),
                contact JSONB,
                first_visit DATE,
                last_visit DATE,
                visit_count INTEGER DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("✓ Providers table created")
        
        # Create visits table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS medical.visits (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                provider_id UUID REFERENCES medical.providers(id),
                visit_date TIMESTAMP NOT NULL,
                visit_type VARCHAR(50),
                chief_complaint TEXT,
                notes TEXT,
                calendar_event_id VARCHAR(255),
                transcription_s3_key TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("✓ Visits table created")
        
        # Create health metrics table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS medical.health_metrics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                metric_type VARCHAR(50) NOT NULL,
                timestamp TIMESTAMP NOT NULL,
                value JSONB NOT NULL,
                unit VARCHAR(20),
                context TEXT,
                provider_id UUID REFERENCES medical.providers(id),
                visit_id UUID REFERENCES medical.visits(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("✓ Health metrics table created")
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_type 
            ON medical.documents(document_type);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_upload_date 
            ON medical.documents(upload_date);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_visits_date 
            ON medical.visits(visit_date);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_visits_provider 
            ON medical.visits(provider_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_metrics_type_time 
            ON medical.health_metrics(metric_type, timestamp);
        """)
        print("✓ Indexes created")
        
        # Create search function
        cursor.execute("""
            CREATE OR REPLACE FUNCTION medical.search_documents(
                query_embedding vector(1024),
                match_threshold float DEFAULT 0.7,
                match_count int DEFAULT 10
            )
            RETURNS TABLE (
                id UUID,
                s3_key TEXT,
                content_text TEXT,
                similarity float,
                metadata JSONB
            )
            LANGUAGE plpgsql
            AS $$
            BEGIN
                RETURN QUERY
                SELECT
                    d.id,
                    d.s3_key,
                    d.content_text,
                    1 - (d.embedding <=> query_embedding) as similarity,
                    d.metadata
                FROM medical.documents d
                WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
                ORDER BY d.embedding <=> query_embedding
                LIMIT match_count;
            END;
            $$;
        """)
        print("✓ Search function created")
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'body': {
                'success': True,
                'message': 'Database initialized successfully'
            }
        }
    
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        return {
            'statusCode': 500,
            'body': {
                'success': False,
                'error': str(e)
            }
        }
