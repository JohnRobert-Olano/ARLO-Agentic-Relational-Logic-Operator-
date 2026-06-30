'use client';

import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import AuthView from '@/app/auth/AuthView';
import DashboardView from '@/app/dashboard/DashboardView';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          width: '100vw',
          gap: '16px',
          background: 'var(--bg-primary)'
        }}
      >
        <div 
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '3px solid rgba(139, 92, 246, 0.1)',
            borderTopColor: '#8b5cf6',
            animation: 'spin 1s linear infinite'
          }}
        />
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
          Syncing secure gateway...
        </span>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return <DashboardView />;
}
