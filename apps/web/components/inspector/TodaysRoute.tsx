/**
 * Today's Route Display Component
 * Shows inspector's assigned route for today
 */

'use client';

import { useState, useEffect } from 'react';

interface RouteStop {
  id: string;
  companyName: string;
  address: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  scheduledTime: string;
  estimatedDuration: number;
  priority: 'high' | 'medium' | 'low';
}

interface TodaysRouteProps {
  inspectorId: string;
}

export function TodaysRoute({ inspectorId }: TodaysRouteProps) {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);  
  useEffect(() => {
    // TODO: Fetch from API
    // For now, mock data
    setStops([
      {
        id: '1',
        companyName: 'შპს ინ ვიტრო',
        address: 'ნოდარ ბოხუას ქ. N21, თბილისი',
        status: 'completed',
        scheduledTime: '09:00',
        estimatedDuration: 30,
        priority: 'high',
      },
      {
        id: '2',
        companyName: 'შპს ტერმინალი',
        address: 'ჭავჭავაძის გამზირი 37მ, თბილისი',
        status: 'in-progress',
        scheduledTime: '10:00',
        estimatedDuration: 45,
        priority: 'medium',
      },
      {
        id: '3',
        companyName: 'შპს ტექინპექცია',
        address: 'ვაჟა-ფშაველას გამზირი 76, თბილისი',
        status: 'pending',
        scheduledTime: '11:00',        estimatedDuration: 60,
        priority: 'low',
      },
      {
        id: '4',
        companyName: 'შპს ინსპექტი',
        address: 'აღმაშენებლის გამზირი 156, თბილისი',
        status: 'pending',
        scheduledTime: '13:00',
        estimatedDuration: 40,
        priority: 'high',
      },
    ]);
    setLoading(false);
  }, [inspectorId]);

  const handleStatusChange = (index: number, newStatus: RouteStop['status']) => {
    const updated = [...stops];
    updated[index].status = newStatus;
    setStops(updated);
    if (newStatus === 'completed' && index === currentStopIndex) {
      setCurrentStopIndex(index + 1);
    }
  };

  if (loading) {
    return <div>იტვირთება...</div>;
  }
  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">დღევანდელი მარშრუტი</h2>
        <div className="text-sm text-gray-600">
          {stops.filter(s => s.status === 'completed').length} / {stops.length} დასრულებული
        </div>
      </div>
      <div className="space-y-4">
        {stops.map((stop, index) => (
          <RouteStopCard
            key={stop.id}
            stop={stop}
            index={index + 1}
            isActive={index === currentStopIndex}
            onStatusChange={(status) => handleStatusChange(index, status)}
          />
        ))}
      </div>
    </div>
  );
}

interface RouteStopCardProps {
  stop: RouteStop;
  index: number;
  isActive: boolean;
  onStatusChange: (status: RouteStop['status']) => void;
}
function RouteStopCard({ stop, index, isActive, onStatusChange }: RouteStopCardProps) {
  const statusColors = {
    pending: 'bg-gray-100 border-gray-300',
    'in-progress': 'bg-blue-50 border-blue-500',
    completed: 'bg-green-50 border-green-500',
    skipped: 'bg-orange-50 border-orange-500',
  };
  
  const priorityColors = {
    high: 'text-red-600',
    medium: 'text-yellow-600',
    low: 'text-gray-600',
  };
  
  return (
    <div className={`p-4 rounded-lg border-2 ${statusColors[stop.status]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg">#{index}</span>
            <span className={`text-xs font-semibold ${priorityColors[stop.priority]}`}>
              {stop.priority === 'high' ? '🔴 მაღალი' : 
               stop.priority === 'medium' ? '🟡 საშუალო' : 
               '🟢 დაბალი'}
            </span>
          </div>
          <h3 className="font-semibold text-base">{stop.companyName}</h3>
          <p className="text-sm text-gray-600">{stop.address}</p>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">            <span>⏰ {stop.scheduledTime}</span>
            <span>⏱️ {stop.estimatedDuration} წთ</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          {stop.status === 'pending' && isActive && (
            <button
              onClick={() => onStatusChange('in-progress')}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              დაწყება
            </button>
          )}
          {stop.status === 'in-progress' && (
            <>
              <button
                onClick={() => onStatusChange('completed')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                დასრულება
              </button>
              <button
                onClick={() => onStatusChange('skipped')}
                className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
              >
                გამოტოვება
              </button>
            </>
          )}
          {stop.status === 'completed' && (            <span className="text-green-600 font-semibold text-sm">
              ✓ დასრულებული
            </span>
          )}
          {stop.status === 'skipped' && (
            <span className="text-orange-600 font-semibold text-sm">
              ⊘ გამოტოვებული
            </span>
          )}
        </div>
      </div>
    </div>
  );
}