'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function DebugPage() {
  const [serviceTypes, setServiceTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchServiceTypes() {
      try {
        const { data, error } = await supabase
          .from('service_types')
          .select('*')
          .order('name')
        
        if (error) {
          console.error('Error fetching service types:', error)
        } else {
          console.log('Service types:', data)
          setServiceTypes(data || [])
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchServiceTypes()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug: Service Types</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <p className="mb-4">Found {serviceTypes.length} service types in database:</p>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(serviceTypes, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
