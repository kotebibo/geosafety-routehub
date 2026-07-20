'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Car, X, Loader2, Check, Home, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui-monday/Toast'
import { useOfficerTransport, useSaveOfficerTransport } from '../hooks/useOfficerTransport'
import { LocationSearchField, type PickedLocation } from './LocationSearchField'

interface OfficerTransportModalProps {
  officerId: string
  officerName: string
  onClose: () => void
}

export function OfficerTransportModal({
  officerId,
  officerName,
  onClose,
}: OfficerTransportModalProps) {
  const t = useTranslations()
  const { showToast } = useToast()
  const { data, isLoading } = useOfficerTransport(officerId)
  const save = useSaveOfficerTransport()

  const [carModel, setCarModel] = useState('')
  const [engine, setEngine] = useState('')
  const [consumption, setConsumption] = useState('')
  const [home, setHome] = useState<PickedLocation | null>(null)
  const [startLoc, setStartLoc] = useState<PickedLocation | null>(null)

  useEffect(() => {
    if (data) {
      setCarModel(data.car_model ?? '')
      setEngine(data.engine ?? '')
      setConsumption(
        data.consumption_l_per_100km != null ? String(data.consumption_l_per_100km) : ''
      )
      setHome(
        data.home_lat != null && data.home_lng != null
          ? { lat: data.home_lat, lng: data.home_lng, address: data.home_address }
          : null
      )
      setStartLoc(
        data.start_lat != null && data.start_lng != null
          ? { lat: data.start_lat, lng: data.start_lng, address: data.start_address }
          : null
      )
    }
  }, [data])

  const handleSave = async () => {
    const consumptionNum = consumption.trim() === '' ? null : Number(consumption)
    if (consumptionNum !== null && (isNaN(consumptionNum) || consumptionNum < 0)) {
      showToast(t('routing.transportConsumptionInvalid'), 'error')
      return
    }
    try {
      await save.mutateAsync({
        user_id: officerId,
        car_model: carModel.trim() || null,
        engine: engine.trim() || null,
        consumption_l_per_100km: consumptionNum,
        home_lat: home?.lat ?? null,
        home_lng: home?.lng ?? null,
        home_address: home?.address ?? null,
        start_lat: startLoc?.lat ?? null,
        start_lng: startLoc?.lng ?? null,
        start_address: startLoc?.address ?? null,
      })
      showToast(t('routing.transportSaved'), 'success')
      onClose()
    } catch {
      showToast(t('routing.transportSaveFailed'), 'error')
    }
  }

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-primary w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-light">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-monday-primary/10 flex items-center justify-center flex-shrink-0">
              <Car className="w-4 h-4 text-monday-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-primary truncate">
                {t('routing.officerProfile')}
              </h3>
              <p className="text-xs text-text-tertiary truncate">{officerName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
            </div>
          ) : (
            <>
              {/* Locations (optional) */}
              <SectionLabel icon={Home}>{t('routing.locationsSection')}</SectionLabel>
              <LocationSearchField
                label={`${t('routing.homeLocation')} (${t('routing.optional')})`}
                value={home}
                onChange={setHome}
              />
              <LocationSearchField
                label={`${t('routing.routeStartLocation')} (${t('routing.optional')})`}
                value={startLoc}
                onChange={setStartLoc}
              />

              {/* Vehicle (optional) */}
              <SectionLabel icon={Car}>{t('routing.vehicleSection')}</SectionLabel>
              <Field label={t('routing.carModel')}>
                <input
                  value={carModel}
                  onChange={e => setCarModel(e.target.value)}
                  placeholder="Toyota Prius"
                  className="w-full px-3 py-2 text-sm bg-bg-primary border border-border-light rounded-lg focus:outline-none focus:border-monday-primary text-text-primary"
                />
              </Field>
              <Field label={`${t('routing.engine')} (${t('routing.optional')})`}>
                <input
                  value={engine}
                  onChange={e => setEngine(e.target.value)}
                  placeholder="1.8 Hybrid"
                  className="w-full px-3 py-2 text-sm bg-bg-primary border border-border-light rounded-lg focus:outline-none focus:border-monday-primary text-text-primary"
                />
              </Field>
              <Field label={t('routing.consumptionPer100')}>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={consumption}
                    onChange={e => setConsumption(e.target.value)}
                    placeholder="7.5"
                    className="w-full px-3 py-2 text-sm bg-bg-primary border border-border-light rounded-lg focus:outline-none focus:border-monday-primary text-text-primary"
                  />
                  <span className="text-sm text-text-tertiary flex-shrink-0">ლ/100კმ</span>
                </div>
              </Field>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-light">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-monday-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {save.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      {children}
    </div>
  )
}

function SectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 pt-2 first:pt-0">
      <Icon className="w-3.5 h-3.5 text-text-tertiary" />
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
        {children}
      </span>
    </div>
  )
}
