'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, UserPlus, AlertCircle, CheckCircle, Chrome } from 'lucide-react';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('from') || '/';
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setError('');
    setSuccess('');
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Validate passwords match
        if (password !== confirmPassword) {
          setError('პაროლები არ ემთხვევა');
          setLoading(false);
          return;
        }

        // Validate password strength
        if (password.length < 6) {
          setError('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო');
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password);

        if (error) {
          if (error.message.includes('already registered')) {
            setError('ეს ელ.ფოსტა უკვე რეგისტრირებულია');
          } else {
            setError(error.message);
          }
        } else {
          setSuccess('რეგისტრაცია წარმატებით დასრულდა! შეამოწმეთ ელ.ფოსტა დასადასტურებლად.');
          // Clear form but stay on page to show success message
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setFullName('');
        }
      } else {
        // Login mode
        const { error } = await signIn(email, password);

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('არასწორი ელ.ფოსტა ან პაროლი');
          } else if (error.message.includes('Email not confirmed')) {
            setError('გთხოვთ დაადასტუროთ ელ.ფოსტა შესვლამდე');
          } else {
            setError(error.message);
          }
        } else {
          // Redirect to the original page or home
          router.push(returnUrl);
          router.refresh();
        }
      }
    } catch (err) {
      setError(mode === 'signup'
        ? 'შეცდომა რეგისტრაციისას. გთხოვთ სცადოთ თავიდან.'
        : 'შეცდომა შესვლისას. გთხოვთ სცადოთ თავიდან.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError('Google-ით შესვლა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.');
      }
      // If successful, Supabase will redirect to the callback URL
    } catch (err) {
      setError('Google-ით შესვლა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            RH
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            GeoSafety RouteHub
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {mode === 'login' ? 'შესვლა სისტემაში' : 'ახალი ანგარიშის შექმნა'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              mode === 'login'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            შესვლა
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              mode === 'signup'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            რეგისტრაცია
          </button>
        </div>

        {/* Form */}
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Full Name - Only for signup */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  სახელი და გვარი
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="თქვენი სახელი"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                ელ.ფოსტა
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your.email@geosafety.ge"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                პაროლი
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-gray-500">მინიმუმ 6 სიმბოლო</p>
              )}
            </div>

            {/* Confirm Password - Only for signup */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  პაროლის დადასტურება
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mode === 'login' ? (
              <>
                <LogIn className="w-5 h-5" />
                {loading ? 'შესვლა...' : 'შესვლა'}
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                {loading ? 'რეგისტრაცია...' : 'რეგისტრაცია'}
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">ან</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {googleLoading ? 'Google-ით შესვლა...' : 'Google-ით შესვლა'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          {mode === 'login' ? (
            <p>
              არ გაქვთ ანგარიში?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                დარეგისტრირდით
              </button>
            </p>
          ) : (
            <p>
              უკვე გაქვთ ანგარიში?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                შესვლა
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
