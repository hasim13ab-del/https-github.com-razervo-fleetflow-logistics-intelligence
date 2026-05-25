import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Role, UserStatus } from '../types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  currentUser: {
    uid: string;
    fullName: string;
    role: Role;
    email: string;
    hubId: string;
    employeeId: string;
    status: UserStatus;
    emailVerified: boolean;
  } | null;
  isLoading: boolean;
  children: React.ReactNode;
}

export default function ProtectedRoute({ currentUser, isLoading, children }: ProtectedRouteProps) {
  useEffect(() => {
    // If not loading, check if the required sessionStorage items exist.
    // If we're authenticated but missing sessionStorage data, force logout.
    if (!isLoading && currentUser) {
      const orgId = sessionStorage.getItem('orgId');
      const role = sessionStorage.getItem('role');
      if (!orgId || !role) {
        console.warn('Session storage missing required auth tokens. Signing out...');
        signOut(auth).catch(err => console.error("SignOut error:", err));
        sessionStorage.clear();
      }
    }
  }, [isLoading, currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center font-sans text-slate-200">
        <div className="p-8 bg-slate-800 border border-slate-700 rounded-2xl flex flex-col items-center gap-4 shadow-2xl max-w-sm text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <div>
            <h3 className="font-bold text-base text-white">Loading FleetFlow ERP</h3>
            <p className="text-xs text-slate-400 mt-1">Verifying session integrity...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    // Ensure session is fully cleared on unauthenticated access
    sessionStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // Strict sessionStorage validation
  const orgId = sessionStorage.getItem('orgId');
  const role = sessionStorage.getItem('role');

  if (!orgId || !role) {
    // Storage tampered or missing — force full sign out and redirect
    console.warn('ProtectedRoute: sessionStorage missing required tokens. Force sign out.');
    signOut(auth).catch(err => console.error("SignOut error:", err));
    sessionStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // Secondary confirmation: verify role from sessionStorage matches currentUser
  if (role !== currentUser.role) {
    console.warn('ProtectedRoute: sessionStorage role mismatch with currentUser. Signing out.');
    signOut(auth).catch(err => console.error("SignOut error:", err));
    sessionStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
