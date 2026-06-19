'use client'

import { Timer, MapPin, Loader2, LogOut, AlertCircle } from 'lucide-react'
import type { LocationCheckin } from '@/types/checkin'

interface GpsCoords {
  lat: number
  lng: number
  accuracy: number
}

interface ActiveCheckinViewProps {
  activeCheckin: LocationCheckin
  elapsedDisplay: string
  gpsCoords: GpsCoords | null
  checkingOut: boolean
  onCheckout: () => void
}

export function ActiveCheckinView({
  activeCheckin,
  elapsedDisplay,
  gpsCoords,
  checkingOut,
  onCheckout,
}: ActiveCheckinViewProps) {
  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <div className="bg-orange-600 text-white sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold">აქტიური ჩეკ-ინი</h1>
                <p className="text-xs text-orange-100">{activeCheckin.company_name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold">{elapsedDisplay}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* GPS status */}
        <div
          className={`rounded-xl border-2 p-4 ${gpsCoords ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${gpsCoords ? 'bg-green-100' : 'bg-gray-100'}`}
            >
              <MapPin className={`w-5 h-5 ${gpsCoords ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p
                className={`text-sm font-semibold ${gpsCoords ? 'text-green-800' : 'text-gray-600'}`}
              >
                {gpsCoords ? 'GPS აქტიურია' : 'GPS მოწმდება...'}
              </p>
              {gpsCoords && (
                <p className="text-xs text-green-600">სიზუსტე: ±{gpsCoords.accuracy}მ</p>
              )}
            </div>
          </div>
        </div>

        {/* Location info */}
        {activeCheckin.location_name && (
          <div className="bg-bg-primary rounded-xl border border-border-light p-4 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-text-tertiary" />
            <span className="text-sm text-text-secondary">{activeCheckin.location_name}</span>
          </div>
        )}

        {/* Info about 2-ping system */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-700">
            ჩეკ-აუთის დროს შედარდება თქვენი ამჟამინდელი მდებარეობა ჩეკ-ინის მდებარეობასთან.
          </p>
        </div>

        {/* Checkout button */}
        <button
          type="button"
          onClick={onCheckout}
          disabled={!gpsCoords || checkingOut}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-red-600 text-white rounded-xl font-semibold text-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
        >
          {checkingOut ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>ჩეკ-აუთი მიმდინარეობს...</span>
            </>
          ) : (
            <>
              <LogOut className="w-6 h-6" />
              <span>ჩეკ-აუთი</span>
            </>
          )}
        </button>

        {!gpsCoords && (
          <p className="text-center text-xs text-red-500 flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            GPS სიგნალის მოლოდინი ჩეკ-აუთისთვის...
          </p>
        )}
      </div>
    </div>
  )
}
