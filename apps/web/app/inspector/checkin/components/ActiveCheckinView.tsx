'use client'

import {
  Timer,
  MapPin,
  Loader2,
  LogOut,
  AlertCircle,
  ShieldAlert,
  Radio,
  CheckCircle2,
} from 'lucide-react'
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
  pingStatus: 'ok' | 'warning' | 'error' | null
  lastPingDistance: number | null
  checkingOut: boolean
  radiusMeters: number
  onCheckout: () => void
}

export function ActiveCheckinView({
  activeCheckin,
  elapsedDisplay,
  gpsCoords,
  pingStatus,
  lastPingDistance,
  checkingOut,
  radiusMeters,
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
                <h1 className="text-lg font-bold">
                  {
                    '\u10D0\u10E5\u10E2\u10D8\u10E3\u10E0\u10D8 \u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8'
                  }
                </h1>
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
        {/* Live GPS Status */}
        <div
          className={`rounded-xl border-2 p-4 ${
            pingStatus === 'ok'
              ? 'bg-green-50 border-green-300'
              : pingStatus === 'warning'
                ? 'bg-red-50 border-red-300'
                : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  pingStatus === 'ok'
                    ? 'bg-green-100'
                    : pingStatus === 'warning'
                      ? 'bg-red-100 animate-pulse'
                      : 'bg-gray-100'
                }`}
              >
                {pingStatus === 'ok' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : pingStatus === 'warning' ? (
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                ) : (
                  <Radio className="w-5 h-5 text-gray-400 animate-pulse" />
                )}
              </div>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    pingStatus === 'ok'
                      ? 'text-green-800'
                      : pingStatus === 'warning'
                        ? 'text-red-800'
                        : 'text-gray-600'
                  }`}
                >
                  {pingStatus === 'ok'
                    ? '\u10E0\u10D0\u10D3\u10D8\u10E3\u10E1\u10E8\u10D8 \u10EE\u10D0\u10E0\u10D7'
                    : pingStatus === 'warning'
                      ? '\u10E0\u10D0\u10D3\u10D8\u10E3\u10E1\u10D8\u10E1 \u10D2\u10D0\u10E0\u10D4\u10D7 \u10EE\u10D0\u10E0\u10D7!'
                      : 'GPS \u10DB\u10DD\u10EC\u10DB\u10D3\u10D4\u10D1\u10D0...'}
                </p>
                <p
                  className={`text-xs ${
                    pingStatus === 'ok'
                      ? 'text-green-600'
                      : pingStatus === 'warning'
                        ? 'text-red-600'
                        : 'text-gray-500'
                  }`}
                >
                  {lastPingDistance !== null
                    ? `\u10DB\u10D0\u10DC\u10EB\u10D8\u10DA\u10D8: ${lastPingDistance}\u10DB`
                    : '\u10DE\u10D8\u10E0\u10D5\u10D4\u10DA\u10D8 \u10DE\u10D8\u10DC\u10D2\u10D8...'}
                  {gpsCoords &&
                    ` \u2022 \u10E1\u10D8\u10D6\u10E3\u10E1\u10E2\u10D4: \u00B1${gpsCoords.accuracy}\u10DB`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  pingStatus === 'ok'
                    ? 'bg-green-500'
                    : pingStatus === 'warning'
                      ? 'bg-red-500 animate-ping'
                      : 'bg-gray-400 animate-pulse'
                }`}
              />
              <span className="text-[10px] text-text-tertiary">LIVE</span>
            </div>
          </div>

          {pingStatus === 'warning' && (
            <div className="mt-3 bg-red-100 rounded-lg px-3 py-2">
              <p className="text-xs text-red-700 font-medium">
                {
                  '\u10D2\u10D0\u10E4\u10E0\u10D7\u10EE\u10D8\u10DA\u10D4\u10D1\u10D0: \u10D7\u10E5\u10D5\u10D4\u10DC \u10D8\u10DB\u10E7\u10DD\u10E4\u10D4\u10D1\u10D8\u10D7'
                }{' '}
                {radiusMeters}
                {
                  '\u10DB \u10E0\u10D0\u10D3\u10D8\u10E3\u10E1\u10D8\u10E1 \u10D2\u10D0\u10E0\u10D4\u10D7. \u10D4\u10E1 \u10D3\u10D0\u10E4\u10D8\u10E5\u10E1\u10D8\u10E0\u10D3\u10D4\u10D1\u10D0 \u10D7\u10E5\u10D5\u10D4\u10DC\u10E1 \u10E9\u10D4\u10D9-\u10D8\u10DC\u10D8\u10E1 \u10D8\u10E1\u10E2\u10DD\u10E0\u10D8\u10D0\u10E8\u10D8.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Location info */}
        {activeCheckin.location_name && (
          <div className="bg-bg-primary rounded-xl border border-border-light p-4 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-text-tertiary" />
            <span className="text-sm text-text-secondary">{activeCheckin.location_name}</span>
          </div>
        )}

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
              <span>
                {
                  '\u10E9\u10D4\u10D9-\u10D0\u10E3\u10D7\u10D8 \u10DB\u10D8\u10DB\u10D3\u10D8\u10DC\u10D0\u10E0\u10D4\u10DD\u10D1\u10E1...'
                }
              </span>
            </>
          ) : (
            <>
              <LogOut className="w-6 h-6" />
              <span>{'\u10E9\u10D4\u10D9-\u10D0\u10E3\u10D7\u10D8'}</span>
            </>
          )}
        </button>

        {!gpsCoords && (
          <p className="text-center text-xs text-red-500 flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            GPS{' '}
            {
              '\u10E1\u10D8\u10D2\u10DC\u10D0\u10DA\u10D8\u10E1 \u10DB\u10DD\u10DA\u10DD\u10D3\u10D8\u10DC\u10D8 \u10E9\u10D4\u10D9-\u10D0\u10E3\u10D7\u10D8\u10E1\u10D7\u10D5\u10D8\u10E1...'
            }
          </p>
        )}
      </div>
    </div>
  )
}
