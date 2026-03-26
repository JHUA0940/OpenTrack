import { useQuery } from '@tanstack/react-query'
import { getValueHistory, getReturnsHistory } from '../api/client'

export function useValueHistory(userId, period) {
  return useQuery({
    queryKey: ['history', 'value', userId, period],
    queryFn: () => getValueHistory(userId, period),
    enabled: !!userId,
  })
}

export function useReturnsHistory(userId, period) {
  return useQuery({
    queryKey: ['history', 'returns', userId, period],
    queryFn: () => getReturnsHistory(userId, period),
    enabled: !!userId,
  })
}
