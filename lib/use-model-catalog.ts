'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ModelCatalogResponse } from './model-registry-types'

const emptyCatalog: ModelCatalogResponse = { models: [], providers: [], refreshedAt: '' }

export function useModelCatalog() {
  const [catalog, setCatalog] = useState<ModelCatalogResponse>(emptyCatalog)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch('/api/models', { cache: 'no-store' })
      const payload = await response.json() as ModelCatalogResponse & { error?: string }
      if (!response.ok) throw new Error(payload.error || '模型目录加载失败。')
      setCatalog(payload)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '模型目录加载失败。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...catalog, loading, error, refresh }
}
