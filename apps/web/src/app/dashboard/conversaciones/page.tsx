"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Robot, User } from '@phosphor-icons/react'

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadConversations() {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, contacts(wa_phone, full_name)')
        .order('last_message_at', { ascending: false })
      
      if (data) setConversations(data)
      setLoading(false)
    }
    loadConversations()
  }, [])

  if (loading) return <div className="p-6 text-center">Cargando conversaciones...</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Conversaciones</h1>
      <div className="grid gap-3">
        {conversations.map(conv => (
          <Card 
            key={conv.id} 
            className="p-4 cursor-pointer hover:bg-muted transition-colors flex items-center justify-between"
            onClick={() => router.push(`/dashboard/conversaciones/${conv.id}`)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                <User size={20} />
              </div>
              <div>
                <p className="font-medium">{conv.contacts?.full_name || conv.contacts?.wa_phone}</p>
                <p className="text-xs text-muted-foreground">
                  Último mensaje: {new Date(conv.last_message_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {conv.bot_active ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Robot size={12} /> Bot Activo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <User size={12} /> Humano
                </span>
              )}
            </div>
          </Card>
        ))}
        {conversations.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No hay conversaciones activas.</div>
        )}
      </div>
    </div>
  )
}
