/**
 * Stop Check-in/Check-out Component
 * Handles location verification and time tracking
 */

'use client';

import { useState } from 'react';

interface CheckInOutProps {
  stopId: string;
  companyName: string;
  expectedLocation: { lat: number; lng: number };
  onCheckIn: (data: CheckInData) => void;
  onCheckOut: (data: CheckOutData) => void;
}

interface CheckInData {
  timestamp: string;
  location: { lat: number; lng: number };
  accuracy: number;
}

interface CheckOutData {
  timestamp: string;
  duration: number;
  notes?: string;
}

export function StopCheckInOut({ stopId, companyName, expectedLocation, onCheckIn, onCheckOut }: CheckInOutProps) {
  const [status, setStatus] = useState<'not-started' | 'checked-in' | 'checked-out'>('not-started');
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const handleCheckIn = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position);
          const now = new Date();
          setCheckInTime(now);
          setStatus('checked-in');
          
          onCheckIn({
            timestamp: now.toISOString(),
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          setLocationError('ვერ მოხერხდა მდებარეობის განსაზღვრა');
          console.error('Location error:', error);
        }
      );
    } else {
      setLocationError('თქვენს მოწყობილობას არ აქვს GPS');
    }
  };
  
  const handleCheckOut = () => {
    if (!checkInTime) return;
    
    const now = new Date();
    const duration = Math.floor((now.getTime() - checkInTime.getTime()) / 1000 / 60); // minutes
    
    setStatus('checked-out');
    
    onCheckOut({
      timestamp: now.toISOString(),
      duration,
      notes: notes || undefined,
    });
  };
  
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in meters
  };
  
  const isLocationValid = location
    ? calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        expectedLocation.lat,
        expectedLocation.lng
      ) < 100 // Within 100 meters
    : false;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-4">{companyName}</h3>
      
      {status === 'not-started' && (
        <div className="space-y-4">
          <button
            onClick={handleCheckIn}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            📍 შესვლა
          </button>
          {locationError && (
            <p className="text-sm text-red-600">{locationError}</p>
          )}
        </div>
      )}
      
      {status === 'checked-in' && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-semibold text-green-800">✓ შესული</p>
            <p className="text-sm text-green-700">
              {checkInTime?.toLocaleTimeString('ka-GE')}
            </p>
            {location && (
              <p className="text-xs text-green-600 mt-1">
                სიზუსტე: {Math.round(location.coords.accuracy)}მ
                {isLocationValid ? ' ✓' : ' ⚠️ შორს ხართ'}
              </p>
            )}
          </div>
          
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="შენიშვნები (არასავალდებულო)..."
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          
          <button
            onClick={handleCheckOut}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
          >
            🚪 გასვლა
          </button>
        </div>
      )}
      
      {status === 'checked-out' && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="font-semibold text-gray-800">✓ დასრულებული</p>
          <p className="text-sm text-gray-600 mt-1">
            ხანგრძლივობა: {Math.floor((new Date().getTime() - (checkInTime?.getTime() || 0)) / 60000)} წთ
          </p>
        </div>
      )}
    </div>
  );
}
