import { useState, useEffect } from 'react'
import api from '@/services/api'
import { AxiosError } from 'axios'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiOptions {
  immediate?: boolean
}

export function useApi<T>(
  url: string,
  options: UseApiOptions = { immediate: true }
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await api.get<T>(url)
      setState({
        data: response.data,
        loading: false,
        error: null,
      })
      return response.data
    } catch (err) {
      const error = err as AxiosError
      const errorMessage = (error.response?.data as any)?.message || error.message || 'An error occurred'
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      })
      throw error
    }
  }

  const reset = () => {
    setState({
      data: null,
      loading: false,
      error: null,
    })
  }

  useEffect(() => {
    if (options.immediate) {
      execute()
    }
  }, [url, options.immediate])

  return {
    ...state,
    execute,
    reset,
  }
}