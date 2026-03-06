'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Dark theme colors
  const theme = {
    primary: '#8b5cf6',
    primaryDark: '#7c3aed',
    background: '#0a0a0a',
    surface: '#1a1a1a',
    text: '#f5f5f5',
    textSecondary: '#a3a3a3',
    border: '#2a2a2a',
  };

  useEffect(() => {
    // Check if already logged in
    const isAuthenticated = sessionStorage.getItem('lazarus_auth');
    if (isAuthenticated === 'true') {
      router.push('/app');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem('lazarus_auth', 'true');
        router.push('/app');
      } else {
        setError('Invalid password');
        setPassword('');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: theme.background }}
    >
      <div className="max-w-md w-full mx-4">
        <div 
          className="rounded-2xl shadow-2xl p-8"
          style={{ 
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`
          }}
        >
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <img 
                src="/logo.svg" 
                alt="Project Lazarus Logo" 
                className="w-16 h-16"
              />
            </div>
            <h1 
              className="text-3xl font-bold mb-2"
              style={{ color: theme.text }}
            >
              Project Lazarus
            </h1>
            <p style={{ color: theme.textSecondary }}>
              Medical Records Assistant
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium mb-2"
                style={{ color: theme.text }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: theme.background,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                }}
                placeholder="Enter your password"
                disabled={isLoading}
                autoFocus
                onFocus={(e) => e.target.style.borderColor = theme.primary}
                onBlur={(e) => e.target.style.borderColor = theme.border}
              />
            </div>

            {error && (
              <div 
                className="px-4 py-3 rounded-lg text-sm"
                style={{
                  backgroundColor: '#7f1d1d',
                  border: '1px solid #991b1b',
                  color: '#fca5a5',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`,
                color: '#ffffff',
              }}
              onMouseEnter={(e) => {
                if (!isLoading && password) {
                  e.currentTarget.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p 
              className="text-xs flex items-center justify-center gap-2"
              style={{ color: theme.textSecondary }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              HIPAA Compliant • Encrypted • Secure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
