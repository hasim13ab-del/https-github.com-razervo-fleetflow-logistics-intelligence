import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { Role, User, Hub, UserStatus } from '../types';
import { setGoogleAccessToken } from '../utils/sheets';
import landingBg from '../assets/logistics_landing_bg_1779387214003.png';
import {
  Mail, Lock, User as UserIcon, Phone, MapPin,
  ShieldAlert, LogIn, Activity, AlertCircle, CheckCircle2,
  Building2, ChevronRight, ChevronLeft, Loader2
} from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (uid: string, profile: {
    fullName: string;
    role: Role;
    email: string;
    hubId: string;
    employeeId: string;
    status: UserStatus;
    emailVerified: boolean;
  }) => void;
  orgName: string;
  setOrgName: (name: string) => void;
  orgLogo?: string;
  setOrgLogo?: (logo: string) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  hubs: Hub[];
  setHubs: React.Dispatch<React.SetStateAction<Hub[]>>;
}

const deriveOrgCode = (name?: string) => {
  const clean = (name || '').trim();
  if (!clean) return 'ORG';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0] + (words[1][1] || words[0][1] || 'X')).toUpperCase();
  }
  if (clean.length <= 3) return clean.toUpperCase();
  return (clean.slice(0, 2) + clean.slice(-1)).toUpperCase();
};

export default function AuthScreen({
  onAuthSuccess,
  orgName,
  setOrgName,
  orgLogo,
  setOrgLogo,
  users,
  setUsers,
  hubs,
  setHubs,
}: AuthScreenProps) {
  const [showLanding, setShowLanding] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [forceLoginView, setForceLoginView] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Wizard fields
  const [wizardStep, setWizardStep] = useState(1);
  const [wizOrgName, setWizOrgName] = useState('');
  const [wizOrgLogo, setWizOrgLogo] = useState('');
  const [wizHubName, setWizHubName] = useState('');
  const [wizHubAddress, setWizHubAddress] = useState('');
  const [wizHubPincode, setWizHubPincode] = useState('');
  const [wizHubLat, setWizHubLat] = useState('26.1158');
  const [wizHubLng, setWizHubLng] = useState('91.7086');
  const [wizHubRadius, setWizHubRadius] = useState('500');
  const [wizHubIsVendor, setWizHubIsVendor] = useState(false);
  const [wizHubVendorName, setWizHubVendorName] = useState('');
  const [wizAdminName, setWizAdminName] = useState('');
  const [wizAdminEmail, setWizAdminEmail] = useState('');
  const [wizAdminPhone, setWizAdminPhone] = useState('');
  const [wizAdminPassword, setWizAdminPassword] = useState('');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  // Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedOrg, setSelectedOrg] = useState(orgName || '');
  const [selectedRole, setSelectedRole] = useState('');

  const registeredOrgs = React.useMemo(() => {
    const orgs = new Set<string>();
    if (orgName) orgs.add(orgName);
    users.forEach((u) => {
      if (u.organizationName) orgs.add(u.organizationName);
    });
    hubs.forEach((h) => {
      if (h.organizationName) orgs.add(h.organizationName);
    });
    return Array.from(orgs);
  }, [orgName, users, hubs]);

  useEffect(() => {
    if (!selectedOrg && orgName) {
      setSelectedOrg(orgName);
    }
  }, [orgName, selectedOrg]);

  // ==========================================
  // GOOGLE SIGN-IN (Gmail Identity Provider)
  // ==========================================
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);

    if (!selectedOrg) {
      setLoading(false);
      setErrorMessage('Please select an organization before signing in.');
      return;
    }
    if (selectedOrg === '__register_org__') {
      setLoading(false);
      setShowWizard(true);
      setForceLoginView(false);
      return;
    }
    if (!selectedRole) {
      setLoading(false);
      setErrorMessage('Please select your role before signing in.');
      return;
    }

    try {
      // Request access token for Google Sheets API scope
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');

      const result = await signInWithPopup(auth, googleProvider);

      // CRITICAL: Capture the Google OAuth2 access token for Sheets API
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
      }

      const firebaseUser = result.user;

      // CRITICAL NAME RULE: Do NOT use Gmail displayName. Only Firestore /users/{uid} Full Name.
      // Query Firestore for the internal profile
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        const profileOrgName = data.organizationName || orgName;
        const orgCode = deriveOrgCode(profileOrgName);
        const fallbackHubId = `${orgCode}H01`;

        if (!profileOrgName || profileOrgName !== selectedOrg) {
          await firebaseSignOut(auth);
          setErrorMessage('Login denied: organization does not match your profile.');
          return;
        }
        if ((data.role || 'supervisor') !== selectedRole) {
          await firebaseSignOut(auth);
          setErrorMessage('Login denied: selected role does not match your profile role.');
          return;
        }

        // Use ONLY the Firestore "Full Name" field, never Gmail displayName
        const profileFullName = data.fullName || 'Unnamed Operator';

        onAuthSuccess(firebaseUser.uid, {
          fullName: profileFullName,
          role: data.role || 'supervisor',
          email: firebaseUser.email || '',
          hubId: data.hubId || fallbackHubId,
          employeeId: data.employeeId || `${orgCode}-${data.hubId || fallbackHubId}-SUP-${Math.floor(1000 + Math.random() * 9000)}`,
          status: data.status || 'active',
          emailVerified: firebaseUser.emailVerified,
        });
      } else {
        await firebaseSignOut(auth);
        setErrorMessage('Profile not found. Please contact your administrator to complete onboarding first.');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in cancelled. Please try again.');
      } else {
        setErrorMessage(err.message || 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // EMAIL/PASSWORD FALLBACK SIGN-IN
  // ==========================================
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter email and password.');
      setLoading(false);
      return;
    }
    if (!selectedOrg) {
      setErrorMessage('Please select an organization.');
      setLoading(false);
      return;
    }
    if (selectedOrg === '__register_org__') {
      setLoading(false);
      setShowWizard(true);
      setForceLoginView(false);
      return;
    }
    if (!selectedRole) {
      setErrorMessage('Please select your role.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const profileOrgName = data.organizationName || orgName;
        const orgCode = deriveOrgCode(profileOrgName);
        const fallbackHubId = `${orgCode}H01`;
        if (!profileOrgName || profileOrgName !== selectedOrg) {
          await firebaseSignOut(auth);
          setErrorMessage('Login denied: organization does not match your profile.');
          return;
        }
        if ((data.role || 'supervisor') !== selectedRole) {
          await firebaseSignOut(auth);
          setErrorMessage('Login denied: selected role does not match your profile role.');
          return;
        }

        onAuthSuccess(uid, {
          fullName: data.fullName,
          role: data.role || 'supervisor',
          email: userCredential.user.email || '',
          hubId: data.hubId || fallbackHubId,
          employeeId: data.employeeId || `${orgCode}-${data.hubId || fallbackHubId}-SUP-${Math.floor(1000 + Math.random() * 9000)}`,
          status: data.status || 'active',
          emailVerified: userCredential.user.emailVerified,
        });
      } else {
        setErrorMessage('Profile not found in database.');
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setErrorMessage('Email not registered. Use Google Sign-In or contact admin.');
      } else if (err.code === 'auth/wrong-password') {
        setErrorMessage('Incorrect password.');
      } else {
        setErrorMessage(err.message || 'Sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email) {
      setErrorMessage('Please enter your email.');
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent!');
      setIsForgotPassword(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // WIZARD SUBMISSION
  // ==========================================
  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (!wizOrgName || !wizHubName || !wizHubAddress || !wizHubPincode || !wizAdminName || !wizAdminEmail || !wizAdminPhone || !wizAdminPassword) {
      setErrorMessage('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
        return await Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out. Please check network and try again.`)), ms)
          )
        ]);
      };

      const userCredential = await withTimeout(
        createUserWithEmailAndPassword(auth, wizAdminEmail, wizAdminPassword),
        20000,
        'Account creation'
      );
      const { uid } = userCredential.user;
      await withTimeout(sendEmailVerification(userCredential.user), 15000, 'Verification email');

      const orgCode = deriveOrgCode(wizOrgName);
      const hubId = `${orgCode}H01`;
      const newHub: Hub = {
        hubId,
        organizationName: wizOrgName,
        name: wizHubName,
        address: wizHubAddress,
        pincode: wizHubPincode,
        location: { latitude: parseFloat(wizHubLat) || 26.1158, longitude: parseFloat(wizHubLng) || 91.7086 },
        radius: parseInt(wizHubRadius) || 500,
        isVendor: wizHubIsVendor,
        config: { qrAttendance: true, gpsTrackingInterval: 30, kpiWeights: { conversion: 0.6, attendance: 0.4 } },
      };

      if (wizHubIsVendor && wizHubVendorName.trim()) {
        newHub.vendorName = wizHubVendorName.trim();
      }

      const newSuperAdmin: User = {
        uid,
        fullName: wizAdminName,
        organizationName: wizOrgName,
        email: wizAdminEmail,
        role: 'super_admin',
        employeeId: `${orgCode}-HQ-ADM-0001`,
        hubId,
        status: 'active',
        phoneNumber: wizAdminPhone,
      };

      // Write to Firestore (order matters for current rules)
      await withTimeout(setDoc(doc(db, 'users', uid), newSuperAdmin), 15000, 'User profile save');
      await withTimeout(setDoc(doc(db, 'hubs', hubId), newHub), 15000, 'Hub save');
      await withTimeout(setDoc(doc(db, 'system', 'config'), {
        orgName: wizOrgName,
        orgLogo: wizOrgLogo || '',
        primaryHubId: hubId,
        updatedAt: new Date().toISOString(),
      }), 15000, 'System config save');

      // Update local state
      setHubs([newHub]);
      setUsers([newSuperAdmin]);
      setOrgName(wizOrgName);
      setSelectedOrg(wizOrgName);
      if (wizOrgLogo && setOrgLogo) {
        setOrgLogo(wizOrgLogo);
      }

      setShowWizard(false);
      setSuccessMessage('ERP initialized! Verification email sent. Verify and sign in.');
      setEmail(wizAdminEmail);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'permission-denied') {
        setErrorMessage('Initialization blocked by Firestore rules. Please retry once or contact admin to verify rules deployment.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMessage('This admin email is already registered. Please use Sign In or Forgot Password.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMessage('Network error during initialization. Please check internet and try again.');
      } else {
        setErrorMessage(err.message || 'Wizard setup failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Login success callback after Google auth
  const handlePostGoogleAuth = (uid: string, profile: any) => {
    onAuthSuccess(uid, profile);
  };

  // ==========================================
  // LANDING PAGE
  // ==========================================
  if (showLanding) {
    return (
      <div className="min-h-screen bg-cover bg-center flex flex-col justify-center items-center text-center text-white" style={{ backgroundImage: `url(${landingBg})` }}>
        <h1 className="text-4xl font-extrabold mb-4 font-display">FleetFlow Logistics ERP</h1>
        <p className="max-w-xl mb-6">
          A premium, industry‑standard ERP platform for hub onboarding, staff management, real‑time rider monitoring, and KPI analytics.
        </p>
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => { setShowLanding(false); setForceLoginView(true); setShowWizard(false); setIsSignUp(false); setIsForgotPassword(false); }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition"
          >
            Login
          </button>
          <button
            onClick={() => { setShowLanding(false); setShowWizard(true); setForceLoginView(false); }}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold transition"
          >
            Register
          </button>
        </div>
        <div className="text-sm space-y-2">
          <p>🔹 <strong>Pricing:</strong> Starter free tier, paid plans start at $49/mo.</p>
          <p>🔹 <strong>About Us:</strong> Building smarter logistics since 2022.</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // SETUP WIZARD
  // ==========================================
  const isWizardMode = !orgName || showWizard;
  if (isWizardMode && !forceLoginView) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-xl z-10">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center border border-blue-400/30">
              <Building2 className="w-5.5 h-5.5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-wider text-white">
              FleetFlow <span className="text-blue-400">ERP Setup Wizard</span>
            </span>
          </div>
          <h2 className="mt-4 text-center text-2xl font-extrabold tracking-tight text-white font-display">
            Initialize Logistics Organization
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10">
          <div className="bg-slate-800/90 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl border border-slate-700 sm:px-10">
            <div className="flex justify-between items-center mb-6">
              <div className={`flex-1 text-center pb-2 border-b-2 font-bold text-xs uppercase tracking-wider ${wizardStep === 1 ? 'border-blue-500 text-blue-400' : 'border-slate-700 text-slate-500'}`}>
                1. Organization & Hub
              </div>
              <div className={`flex-1 text-center pb-2 border-b-2 font-bold text-xs uppercase tracking-wider ${wizardStep === 2 ? 'border-blue-500 text-blue-400' : 'border-slate-700 text-slate-500'}`}>
                2. Super Admin
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 bg-rose-900/40 border border-rose-500/50 rounded-xl p-3 flex items-start gap-2 text-rose-200 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleWizardSubmit} className="space-y-4">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Organization Name</label>
                    <input type="text" required placeholder="e.g. Apex Logistics" value={wizOrgName} onChange={e => setWizOrgName(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Organization Logo (Optional)</label>
                    <input type="file" accept="image/*" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { const reader = new FileReader(); reader.onloadend = () => setWizOrgLogo(reader.result as string); reader.readAsDataURL(file); }
                    }} className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-sm" />
                    {wizOrgLogo && <img src={wizOrgLogo} alt="Preview" className="h-12 object-contain mt-2" />}
                  </div>
                  <div className="border-t border-slate-700/60 pt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Primary Hub</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Hub Name</label>
                        <input type="text" required placeholder="Okhla Hub" value={wizHubName} onChange={e => setWizHubName(e.target.value)}
                          className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Pincode</label>
                        <input type="text" required maxLength={6} placeholder="110020" value={wizHubPincode} onChange={e => setWizHubPincode(e.target.value)}
                          className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-xs" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Address</label>
                      <input type="text" required placeholder="Phase III, Okhla, New Delhi" value={wizHubAddress} onChange={e => setWizHubAddress(e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-xs" />
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-1">Lat</label>
                        <input type="text" value={wizHubLat} onChange={e => setWizHubLat(e.target.value)}
                          className="block w-full px-2 py-1.5 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-center" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-1">Lng</label>
                        <input type="text" value={wizHubLng} onChange={e => setWizHubLng(e.target.value)}
                          className="block w-full px-2 py-1.5 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-center" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-1">Radius (m)</label>
                        <input type="text" value={wizHubRadius} onChange={e => setWizHubRadius(e.target.value)}
                          className="block w-full px-2 py-1.5 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-center" />
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-slate-900/40 border border-slate-700/60 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">Vendor Facility?</span>
                        <span className="text-[10px] text-slate-500">3rd party logistics vendor</span>
                      </div>
                      <input type="checkbox" checked={wizHubIsVendor} onChange={e => setWizHubIsVendor(e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                    </div>
                    {wizHubIsVendor && (
                      <div className="mt-3">
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Vendor Name</label>
                        <input type="text" placeholder="Blue Dart, DHL" value={wizHubVendorName} onChange={e => setWizHubVendorName(e.target.value)}
                          className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-xs" />
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => { if (!wizOrgName || !wizHubName || !wizHubAddress || !wizHubPincode) { setErrorMessage('Complete all fields.'); return; } setErrorMessage(null); setWizardStep(2); }}
                    className="w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs uppercase transition cursor-pointer">
                    Configure Admin <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Full Name</label>
                    <input type="text" required placeholder="Ranjan Goswami" value={wizAdminName} onChange={e => setWizAdminName(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Admin Email</label>
                    <input type="email" required placeholder="admin@fleetflow.com" value={wizAdminEmail} onChange={e => setWizAdminEmail(e.target.value)}
                      className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Phone</label>
                      <input type="text" required placeholder="+91 94350 12345" value={wizAdminPhone} onChange={e => setWizAdminPhone(e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">Password</label>
                      <input type="password" required placeholder="••••••••" value={wizAdminPassword} onChange={e => setWizAdminPassword(e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-xs" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setWizardStep(1)}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-slate-750 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs uppercase transition cursor-pointer">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-2 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs uppercase transition cursor-pointer shadow">
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Initializing...</> : 'Initialize & Register'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // LOGIN / SIGNUP VIEW
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-200 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center border border-blue-400/30">
            <Activity className="w-5.5 h-5.5 text-white animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-wider text-white">
            {orgName} <span className="text-blue-400">ERP</span>
          </span>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold tracking-tight text-white font-display">
          {isForgotPassword ? 'Reset Password' : isSignUp ? 'Activate Account' : 'Sign In'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">Logistics Operations Console</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl border border-slate-700 sm:px-10">
          {errorMessage && (
            <div className="mb-4 bg-rose-900/40 border border-rose-500/50 rounded-xl p-3 flex items-start gap-2 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mb-4 bg-emerald-900/40 border border-emerald-500/50 rounded-xl p-3 flex items-start gap-2 text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* GOOGLE SIGN-IN BUTTON */}
          {!isForgotPassword && !isSignUp && (
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-lg text-sm transition shadow cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                {loading ? 'Signing in...' : 'Sign in with Gmail'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-slate-800 px-2 text-slate-500">or sign in with email</span></div>
              </div>
            </div>
          )}

          {/* ORG & ROLE SELECT */}
          {!isForgotPassword && !isSignUp && (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Organization</label>
                <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none">
                  <option value="">Select organization</option>
                  {registeredOrgs.map(org => <option key={org} value={org}>{org}</option>)}
                  <option value="__register_org__">+ Register Organization</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Role</label>
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none">
                  <option value="">Select role</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="hub_admin">Hub Admin</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="rider">Rider</option>
                </select>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {isForgotPassword && (
            <form onSubmit={handleForgotPasswordAction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-sm" />
              </div>
              <div className="flex justify-between text-xs pt-1">
                <button type="button" onClick={() => setIsForgotPassword(false)} className="font-medium text-slate-400 hover:text-white">Back to login</button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs uppercase transition cursor-pointer">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {/* SIGN UP */}
          {isSignUp && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setErrorMessage(null);
              if (!signUpEmail || !signUpPassword) { setErrorMessage('Email and password required.'); setLoading(false); return; }
              try {
                const userCredential = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
                await sendEmailVerification(userCredential.user);
                const matched = users.find(u => u.email?.toLowerCase() === signUpEmail.toLowerCase());
                if (matched) {
                  await setDoc(doc(db, 'users', userCredential.user.uid), { ...matched, uid: userCredential.user.uid });
                }
                setSuccessMessage('Account created! Check email for verification.');
                setIsSignUp(false);
                setEmail(signUpEmail);
              } catch (err: any) { setErrorMessage(err.message); } finally { setLoading(false); }
            }} className="space-y-4">
              <div className="p-3 bg-blue-950/40 border border-blue-900/60 rounded-xl text-xs text-blue-300">
                Your email must be pre-onboarded by an administrator.
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Email</label>
                <input type="email" required value={signUpEmail} onChange={e => setSignUpEmail(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Password</label>
                <input type="password" required value={signUpPassword} onChange={e => setSignUpPassword(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-sm" />
              </div>
              <div className="flex justify-between text-xs pt-1">
                <button type="button" onClick={() => setIsSignUp(false)} className="font-medium text-slate-400 hover:text-white">Back to login</button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs uppercase transition cursor-pointer">
                {loading ? 'Activating...' : 'Activate Account'}
              </button>
            </form>
          )}

          {/* EMAIL SIGN IN */}
          {!isSignUp && !isForgotPassword && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 text-sm" />
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <button type="button" onClick={() => setIsForgotPassword(true)} className="font-medium text-blue-400 hover:text-blue-300">Forgot Password?</button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs uppercase transition cursor-pointer">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* SIGN UP LINK */}
          {!isForgotPassword && (
            <div className="mt-5 border-t border-slate-700/60 pt-4 text-center">
              <button type="button" onClick={() => { setIsSignUp(!isSignUp); setErrorMessage(null); setSuccessMessage(null); }}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                {isSignUp ? 'Have an account? Sign in' : 'New user? Activate your account'}
              </button>
              {!isSignUp && selectedOrg === '__register_org__' && (
                <div className="mt-2 text-[11px] text-emerald-400">Organization registration selected. Click Sign In or Gmail Sign In to continue setup flow.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}