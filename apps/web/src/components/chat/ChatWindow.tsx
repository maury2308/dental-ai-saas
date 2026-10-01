"use client"

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { PaperPlaneRight, Robot, User, UserFocus } from '@phosphor-icons/react'

interface Message {
  id: string
  content: string
  sender: 'contact' | 'bot' | 'human'
  created_at: string
}

export default function ChatWindow({ conversationId, organizationId }: { conversationId: string, organizationId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [botActive, setBotActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    // 1. Initial Load
    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
    }
    loadMessages()

    // 2. Realtime Subscription
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `conversation_id=eq.${conversationId}` 
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim()) return
    setLoading(true)
    const content = input
    setInput('')

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        organization_id: organizationId,
        direction: 'outbound',
        sender: 'human',
        content: content,
      })
      if (error) throw error
      
      // When human sends a message, automatically disable bot
      await supabase.from('conversations').update({ bot_active: false }).eq('id', conversationId)
      setBotActive(false)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function toggleBot(checked: boolean) {
    setBotActive(checked)
    await supabase.from('conversations').update({ bot_active: checked }).eq('id', conversationId)
  }

  return (
    <div className="flex flex-col h-full border rounded-xl bg-background overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <UserFocus size={20} />
          <span className="font-semibold">Conversación Paciente</span>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="bot-toggle" className="text-xs">Bot Activo</Label>
          <Switch id="bot-toggle" checked={botActive} onCheckedChange={toggleBot} />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'contact' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm shadow-sm ${
              msg.sender === 'contact' 
                ? 'bg-white text-slate-900 rounded-tl-none' 
                : msg.sender === 'bot' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-indigo-600 text-white rounded-tr-none'
            }`}>
              <div className="flex items-center gap-1 mb-1 opacity-70 text-[10px] uppercase font-bold">
                {msg.sender === 'contact' && <><User size={10} /> Paciente</>}
                {msg.sender === 'bot' && <><Robot size={10} /> IA Bot</>}
                {msg.sender === 'human' && <><User size={10} /> Admin</>}
              </div>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4 border-t bg-background flex gap-2">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Escribe un mensaje como humano..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading}>
          <PaperPlaneRight size={20} />
        </Button>
      </form>
    </div>
  )
}
