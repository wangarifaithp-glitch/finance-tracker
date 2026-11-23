import { useEffect, useRef } from 'react'
import { isDemoMode, supabase } from '../data/supabaseClient.js'

export function useRealtimeRefresh(userId, tableNames, onChange) {
  const tableKey = Array.from(tableNames).sort().join('|')
  const changeRef = useRef(onChange)

  useEffect(() => {
    changeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const tables = tableKey ? tableKey.split('|') : []
    if (isDemoMode || !supabase || !userId || !tables.length) {
      return undefined
    }

    const channelName = `finance-tracker:${userId}:${tables.join(':')}`
    let channel = supabase.channel(channelName)

    tables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${userId}`,
        },
        () => changeRef.current(),
      )
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableKey, userId])
}
