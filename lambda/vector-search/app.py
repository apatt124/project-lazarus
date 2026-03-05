"""
Project Lazarus - Vector Search Lambda
Handles semantic search over medical documents using RDS + pgvector
"""

import json
import os
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor

# Simple logging
def log(message):
    print(message)

# AWS clients
bedrock_runtime = boto3.client('bedrock-runtime')
secrets_client = boto3.client('secretsmanager')
s3_client = boto3.client('s3')

# Environment variables
DB_ENDPOINT = os.environ['DB_ENDPOINT']
DB_NAME = os.environ.get('DB_NAME', 'postgres')
DB_USER = os.environ.get('DB_USER', 'lazarus_admin')
S3_BUCKET = os.environ['S3_BUCKET']

# Cache database connection
_db_connection = None


def get_db_connection():
    """Get or create database connection"""
    global _db_connection
    
    try:
        # Check if connection exists and is healthy
        if _db_connection is not None and not _db_connection.closed:
            # Test the connection
            cursor = _db_connection.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            return _db_connection
    except:
        # Connection is bad, close it
        if _db_connection:
            try:
                _db_connection.close()
            except:
                pass
        _db_connection = None
    
    # Create new connection
    secret = secrets_client.get_secret_value(SecretId='lazarus/db-password')
    db_password = secret['SecretString']
    
    _db_connection = psycopg2.connect(
        host=DB_ENDPOINT,
        database=DB_NAME,
        user=DB_USER,
        password=db_password,
        connect_timeout=5
    )
    _db_connection.autocommit = True  # Enable autocommit to avoid transaction issues
    
    return _db_connection


def get_embedding(text: str) -> list:
    """Generate embedding using Bedrock Titan model"""
    try:
        response = bedrock_runtime.invoke_model(
            modelId='amazon.titan-embed-text-v2:0',
            body=json.dumps({
                "inputText": text,
                "dimensions": 1024,
                "normalize": True
            })
        )
        
        result = json.loads(response['body'].read())
        return result['embedding']
    
    except Exception as e:
        log(f"Error generating embedding: {str(e)}")
        raise


def search_documents(query_text: str, limit: int = 10, threshold: float = 0.05) -> list:
    """Search medical documents using vector similarity"""
    try:
        # Generate embedding for query
        query_embedding = get_embedding(query_text)
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Search using pgvector - get more results to account for chunks
        cursor.execute("""
            SELECT * FROM medical.search_documents(
                %s::vector(1024),
                %s,
                %s
            )
        """, (query_embedding, threshold, limit * 3))  # Get 3x results to handle chunks
        
        results = cursor.fetchall()
        cursor.close()
        
        # Group chunks from the same document
        documents_map = {}
        for row in results:
            metadata = row['metadata'] or {}
            
            # Check if this is a chunk
            if metadata.get('is_chunk'):
                parent_key = metadata.get('parent_s3_key')
                chunk_index = metadata.get('chunk_index', 0)
                
                if parent_key not in documents_map:
                    documents_map[parent_key] = {
                        'id': str(row['id']),
                        's3_key': parent_key,
                        'content': '',
                        'chunks': [],
                        'similarity': float(row['similarity']),
                        'metadata': metadata,
                        'is_chunked': True
                    }
                
                # Add chunk content
                documents_map[parent_key]['chunks'].append({
                    'index': chunk_index,
                    'content': row['content_text'] or '',
                    'similarity': float(row['similarity'])
                })
                
                # Update best similarity score
                if float(row['similarity']) > documents_map[parent_key]['similarity']:
                    documents_map[parent_key]['similarity'] = float(row['similarity'])
            else:
                # Regular document (not chunked)
                doc_key = row['s3_key']
                if doc_key not in documents_map:
                    content = row['content_text'] if row['content_text'] else ''
                    documents_map[doc_key] = {
                        'id': str(row['id']),
                        's3_key': doc_key,
                        'content': content[:10000] if len(content) > 10000 else content,
                        'similarity': float(row['similarity']),
                        'metadata': metadata,
                        'is_chunked': False
                    }
        
        # Convert to list and sort by similarity
        documents = list(documents_map.values())
        documents.sort(key=lambda x: x['similarity'], reverse=True)
        
        # For chunked documents, combine chunk content
        for doc in documents:
            if doc.get('is_chunked') and doc.get('chunks'):
                # Sort chunks by index
                doc['chunks'].sort(key=lambda x: x['index'])
                # Combine content from top matching chunks (up to 5 chunks)
                top_chunks = sorted(doc['chunks'], key=lambda x: x['similarity'], reverse=True)[:5]
                top_chunks.sort(key=lambda x: x['index'])  # Re-sort by index for reading order
                doc['content'] = '\n\n[...]\n\n'.join([c['content'] for c in top_chunks])
                doc['chunk_count'] = len(doc['chunks'])
        
        # Limit to requested number of documents
        documents = documents[:limit]
        
        log(f"Found {len(documents)} documents for query")
        return documents
    
    except Exception as e:
        log(f"Error searching documents: {str(e)}")
        raise


def store_document(s3_key: str, content_text: str, metadata: dict = None) -> dict:
    """Store document with embedding in database"""
    conn = None
    try:
        # Generate embedding
        embedding = get_embedding(content_text)
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert document
        cursor.execute("""
            INSERT INTO medical.documents 
            (s3_key, content_text, embedding, metadata, document_type)
            VALUES (%s, %s, %s::vector(1024), %s, %s)
            RETURNING id
        """, (
            s3_key,
            content_text,
            embedding,
            json.dumps(metadata) if metadata else None,
            metadata.get('document_type') if metadata else None
        ))
        
        doc_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        
        log(f"Stored document {doc_id} with embedding")
        return {
            'success': True,
            'document_id': str(doc_id),
            's3_key': s3_key
        }
    
    except Exception as e:
        log(f"Error storing document: {str(e)}")
        if conn:
            conn.rollback()
        raise


def store_chunked_document(s3_key: str, chunks: list, metadata: dict = None) -> dict:
    """Store large document as multiple chunks with separate embeddings"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        document_ids = []
        total_chunks = len(chunks)
        
        log(f"Storing {total_chunks} chunks for document {s3_key}")
        
        for i, chunk_text in enumerate(chunks):
            # Generate embedding for this chunk
            embedding = get_embedding(chunk_text)
            
            # Create chunk-specific metadata
            chunk_metadata = {
                **(metadata or {}),
                'chunk_index': i,
                'total_chunks': total_chunks,
                'is_chunk': True,
                'parent_s3_key': s3_key,
            }
            
            # Create unique s3_key for each chunk
            chunk_s3_key = f"{s3_key}#chunk{i}"
            
            # Insert chunk
            cursor.execute("""
                INSERT INTO medical.documents 
                (s3_key, content_text, embedding, metadata, document_type)
                VALUES (%s, %s, %s::vector(1024), %s, %s)
                RETURNING id
            """, (
                chunk_s3_key,
                chunk_text,
                embedding,
                json.dumps(chunk_metadata),
                metadata.get('document_type') if metadata else None
            ))
            
            doc_id = cursor.fetchone()[0]
            document_ids.append(str(doc_id))
            
            log(f"Stored chunk {i+1}/{total_chunks} with ID {doc_id}")
        
        cursor.close()
        
        return {
            'success': True,
            'document_ids': document_ids,
            's3_key': s3_key,
            'chunks_stored': total_chunks
        }
    
    except Exception as e:
        log(f"Error storing chunked document: {str(e)}")
        if conn:
            conn.rollback()
        raise


def lambda_handler(event: dict, context) -> dict:
    """Main Lambda handler for Bedrock Agent action group"""
    
    log(f"Received event: {json.dumps(event)}")
    
    # Extract action and parameters from Bedrock Agent event
    api_path = event.get('apiPath', '')
    http_method = event.get('httpMethod', '')
    parameters = event.get('parameters', [])
    
    # Convert parameters list to dict
    params = {p['name']: p['value'] for p in parameters}
    
    try:
        # Route to appropriate function
        if api_path == '/search' and http_method == 'POST':
            query = params.get('query', '')
            limit = int(params.get('limit', 10))
            
            results = search_documents(query, limit=limit)
            
            response_body = {
                'success': True,
                'query': query,
                'results': results,
                'count': len(results)
            }
        
        elif api_path == '/store' and http_method == 'POST':
            s3_key = params.get('s3_key')
            content = params.get('content')
            metadata = json.loads(params.get('metadata', '{}'))
            
            result = store_document(s3_key, content, metadata)
            response_body = result
        
        elif api_path == '/store-chunked' and http_method == 'POST':
            s3_key = params.get('s3_key')
            chunks = json.loads(params.get('chunks', '[]'))
            metadata = json.loads(params.get('metadata', '{}'))
            
            result = store_chunked_document(s3_key, chunks, metadata)
            response_body = result
        
        elif api_path == '/check-duplicate' and http_method == 'POST':
            content_hash = params.get('content_hash')
            
            # Check if document with this hash exists
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT id, s3_key, document_type, metadata
                FROM medical.documents
                WHERE metadata->>'contentHash' = %s
                LIMIT 1
            """, (content_hash,))
            
            result = cursor.fetchone()
            cursor.close()
            
            if result:
                response_body = {
                    'exists': True,
                    'document': {
                        'id': str(result['id']),
                        's3_key': result['s3_key'],
                        'document_type': result['document_type'],
                        'metadata': result['metadata']
                    }
                }
            else:
                response_body = {
                    'exists': False
                }
        
        elif api_path == '/stats' and http_method == 'GET':
            # Get comprehensive database statistics
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Total documents
            cursor.execute("SELECT COUNT(*) as count FROM medical.documents")
            total_docs = cursor.fetchone()['count']
            
            # Document types
            cursor.execute("""
                SELECT document_type, COUNT(*) as count
                FROM medical.documents
                WHERE document_type IS NOT NULL
                GROUP BY document_type
                ORDER BY count DESC
            """)
            doc_types = [dict(row) for row in cursor.fetchall()]
            
            # Providers
            cursor.execute("""
                SELECT DISTINCT metadata->>'provider_name' as provider
                FROM medical.documents
                WHERE metadata->>'provider_name' IS NOT NULL
            """)
            providers = [row['provider'] for row in cursor.fetchall()]
            
            # Check for test data (documents with "test" in s3_key or content)
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM medical.documents
                WHERE 
                    s3_key LIKE '%test%' OR
                    content_text ILIKE '%Dr. Sarah Johnson%' OR
                    metadata->>'isTest' = 'true'
            """)
            test_count = cursor.fetchone()['count']
            
            # Get all document details for transparency
            cursor.execute("""
                SELECT 
                    id,
                    s3_key,
                    document_type,
                    metadata->>'provider_name' as provider,
                    metadata->>'document_date' as doc_date,
                    metadata->>'filename' as filename,
                    LEFT(content_text, 150) as content_preview
                FROM medical.documents
                ORDER BY s3_key DESC
            """)
            all_docs = []
            for row in cursor.fetchall():
                # Determine if this is test data
                is_test = (
                    'test' in (row['s3_key'] or '').lower() or
                    'Dr. Sarah Johnson' in (row['content_preview'] or '')
                )
                
                all_docs.append({
                    'id': str(row['id']),
                    's3_key': row['s3_key'],
                    'document_type': row['document_type'],
                    'provider': row['provider'],
                    'document_date': row['doc_date'],
                    'filename': row['filename'],
                    'content_preview': row['content_preview'],
                    'is_test_data': is_test
                })
            
            cursor.close()
            
            response_body = {
                'success': True,
                'total_documents': total_docs,
                'document_types': doc_types,
                'providers': providers,
                'has_test_data': test_count > 0,
                'test_document_count': test_count,
                'real_document_count': total_docs - test_count,
                'all_documents': all_docs
            }
        
        else:
            response_body = {
                'success': False,
                'error': f'Unknown endpoint: {http_method} {api_path}'
            }
        
        status_code = 200
    
    except Exception as e:
        log(f"Error processing request: {str(e)}")
        response_body = {
            'success': False,
            'error': str(e)
        }
        status_code = 500
    
    # Return in Bedrock Agent format
    return {
        'messageVersion': '1.0',
        'response': {
            'actionGroup': event.get('actionGroup'),
            'apiPath': api_path,
            'httpMethod': http_method,
            'httpStatusCode': status_code,
            'responseBody': {
                'application/json': {
                    'body': json.dumps(response_body)
                }
            }
        }
    }
