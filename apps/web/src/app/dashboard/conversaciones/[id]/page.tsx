"use client"

import { useParams } from 'next/navigation'
import ChatWindow from '@/components/chat/ChatWindow'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function ConversationDetail() {
  const params = useParams()
  const conversationId = params.id as string
  const [orgId, setOrgId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadOrg() {
      const { data: { user } } = await supabase.auth.getUser()
      setOrgId(user?.user_metadata?.organization_id || null)
    }
    loadOrg()
  }, [])

  if (!orgId) return <div className="p-6 text-center">Cargando organización...</div>

  return (
    <div className="h-[calc(100vh-64px)] p-6">
      <ChatWindow conversationId={conversationId} organizationId={orgId} />
    </div>
  )
}
