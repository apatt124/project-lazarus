'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Theme } from '@/lib/themes';

interface DocumentUploadProps {
  theme: Theme;
  onClose?: () => void;
}

export default function DocumentUpload({ theme, onClose }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    zipResults?: any[];
  }>({ type: null, message: '' });
  const [metadata, setMetadata] = useState({
    documentType: 'visit_notes',
    provider: '',
    date: '',
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const analyzeDocument = async (file: File) => {
    setAnalyzing(true);
    try {
      // For text files, read content directly
      // For PDFs and images, we'll analyze after upload
      let content = '';
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        content = await file.text();
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // For PDFs, just use filename for now - full analysis happens server-side
        content = `PDF document: ${file.name}`;
      } else if (file.type.startsWith('image/')) {
        // For images, just use filename - vision analysis happens server-side
        content = `Image document: ${file.name}`;
      } else {
        content = `Document: ${file.name}`;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();
      
      if (data.success && data.analysis) {
        // Pre-fill the form with detected information
        setMetadata({
          documentType: data.analysis.documentType || 'other',
          provider: data.analysis.providerName || '',
          date: data.analysis.documentDate || '',
          notes: data.analysis.summary || '',
        });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      // Continue with upload even if analysis fails
    } finally {
      setAnalyzing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setSelectedFile(file);
    setUploadStatus({ type: null, message: '' });

    try {
      // Analyze the document to extract metadata
      await analyzeDocument(file);
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: `Failed to process file: ${error}`,
      });
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('metadata', JSON.stringify(metadata));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        if (data.isZip) {
          // Handle zip file results
          setUploadStatus({
            type: 'success',
            message: `ZIP file processed: ${data.successCount} uploaded, ${data.duplicateCount} duplicates, ${data.errorCount} errors`,
            zipResults: data.results,
          });
        } else if (data.duplicate) {
          setUploadStatus({
            type: 'success',
            message: `This document was already uploaded previously. No duplicate created.`,
          });
        } else {
          setUploadStatus({
            type: 'success',
            message: `Document uploaded successfully!`,
          });
        }
        
        // Reset form
        setSelectedFile(null);
        setMetadata({
          documentType: 'visit_notes',
          provider: '',
          date: '',
          notes: '',
        });
        
        // Close modal after 2 seconds
        if (onClose) {
          setTimeout(() => onClose(), 2000);
        }
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: `Upload failed: ${error}`,
      });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/bmp': ['.bmp'],
      'image/tiff': ['.tiff', '.tif'],
      'image/webp': ['.webp'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
    },
    maxFiles: 1,
    disabled: uploading || analyzing,
  });

  return (
    <div className="rounded-3xl p-8" style={{ backgroundColor: theme.colors.surface }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.gradients.primary} flex items-center justify-center`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>Upload Document</h2>
            <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Add medical records</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-all"
            style={{ color: theme.colors.textSecondary }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          uploading || analyzing ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{
          borderColor: isDragActive ? theme.colors.primary : theme.colors.border,
          backgroundColor: isDragActive ? theme.colors.primary + '10' : 'transparent',
        }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: theme.colors.primary + '20' }}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.colors.primary }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          {isDragActive ? (
            <p className="text-lg font-medium" style={{ color: theme.colors.primary }}>Drop it here!</p>
          ) : analyzing ? (
            <div>
              <p className="text-base font-medium mb-1" style={{ color: theme.colors.primary }}>
                Analyzing document...
              </p>
              <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                Extracting metadata with AI
              </p>
            </div>
          ) : selectedFile ? (
            <div>
              <p className="text-base font-medium mb-1" style={{ color: theme.colors.text }}>
                ✓ {selectedFile.name}
              </p>
              <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                Review details below and click Upload
              </p>
            </div>
          ) : (
            <div>
              <p className="text-base font-medium mb-1" style={{ color: theme.colors.text }}>
                Drag & drop or click to browse
              </p>
              <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                TXT, PDF, DOC, DOCX, PNG, JPG, ZIP, and more
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Show form only after file is selected */}
      {selectedFile && (
        <>
          {analyzing && (
            <div className="mt-4 p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: theme.colors.primary + '10' }}>
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.colors.primary }}></div>
              <p className="text-sm" style={{ color: theme.colors.primary }}>
                AI is analyzing your document to extract information...
              </p>
            </div>
          )}
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
            Document Type
          </label>
          <select
            value={metadata.documentType}
            onChange={(e) => setMetadata({ ...metadata, documentType: e.target.value })}
            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
            }}
            disabled={uploading}
          >
            <option value="visit_notes">📋 Visit Notes</option>
            <option value="lab_results">🧪 Lab Results</option>
            <option value="prescription">💊 Prescription</option>
            <option value="imaging">🔬 Imaging Report</option>
            <option value="vaccination">💉 Vaccination Record</option>
            <option value="other">📄 Other</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
              Provider <span style={{ color: theme.colors.textSecondary }}>(Optional)</span>
            </label>
            <input
              type="text"
              value={metadata.provider}
              onChange={(e) => setMetadata({ ...metadata, provider: e.target.value })}
              placeholder="Dr. Smith"
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
              }}
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
              Date <span style={{ color: theme.colors.textSecondary }}>(Optional)</span>
            </label>
            <input
              type="date"
              value={metadata.date}
              onChange={(e) => setMetadata({ ...metadata, date: e.target.value })}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
              }}
              disabled={uploading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
            Notes <span style={{ color: theme.colors.textSecondary }}>(Optional)</span>
          </label>
          <textarea
            value={metadata.notes}
            onChange={(e) => setMetadata({ ...metadata, notes: e.target.value })}
            placeholder="Additional information..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all resize-none"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
            }}
            disabled={uploading}
          />
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || analyzing}
          className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: theme.colors.primary,
            color: '#ffffff',
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>
      </>
      )}

      {/* Status Messages */}
      {uploadStatus.type && (
        <div
          className={`mt-6 p-4 rounded-xl ${
            uploadStatus.type === 'success'
              ? 'bg-green-500/10 text-green-600 border border-green-500/20'
              : 'bg-red-500/10 text-red-600 border border-red-500/20'
          }`}
        >
          <div className="flex items-start gap-3">
            {uploadStatus.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{uploadStatus.message}</p>
              
              {/* Show detailed results for ZIP files */}
              {uploadStatus.zipResults && uploadStatus.zipResults.length > 0 && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {uploadStatus.zipResults.map((result, idx) => (
                    <div 
                      key={idx}
                      className="text-xs p-2 rounded flex items-center gap-2"
                      style={{ backgroundColor: theme.colors.background }}
                    >
                      {result.success ? (
                        result.duplicate ? (
                          <span className="text-yellow-500">⚠️</span>
                        ) : (
                          <span className="text-green-500">✓</span>
                        )
                      ) : (
                        <span className="text-red-500">✗</span>
                      )}
                      <span className="flex-1 truncate" style={{ color: theme.colors.text }}>
                        {result.fileName}
                      </span>
                      {result.duplicate && (
                        <span className="text-yellow-600 text-xs">duplicate</span>
                      )}
                      {result.error && (
                        <span className="text-red-600 text-xs truncate max-w-xs" title={result.error}>
                          {result.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl" style={{ backgroundColor: theme.colors.primary + '20' }}>
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 border-3 rounded-full" style={{ borderColor: theme.colors.primary + '40' }}></div>
              <div className="absolute inset-0 border-3 rounded-full border-t-transparent animate-spin" style={{ borderColor: theme.colors.primary }}></div>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: theme.colors.primary }}>Uploading to S3 and generating embeddings...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
