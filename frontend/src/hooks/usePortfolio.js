import { useQuery } from '@tanstack/react-query'
import { getCurrentPortfolio, listSnapshots } from '../api/client'

export function useCurrentPortfolio(userId) {
  return useQuery({
    queryKey: ['portfolio', 'current', userId],
    queryFn: () => getCurrentPortfolio(userId),
    enabled: !!userId,
  })
}

export function useSnapshots(userId) {
  return useQuery({
    queryKey: ['portfolio', 'snapshots', userId],
    queryFn: () => listSnapshots(userId),
    enabled: !!userId,
  })
}
