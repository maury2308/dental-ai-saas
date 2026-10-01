"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, CalendarCheck, MessageCircle, TrendingUp } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalConversations: 0,
    appointmentsThisWeek: 0,
    conversionRate: 0,
  })
  const [recentConversations, setRecentConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser()
      const orgId = user?.user_metadata?.organization_id

      if (!orgId) return

      // KPI 1: Unique conversations last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: convCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      // KPI 2: Appointments this week
      const startOfWeek = new Date()
      startOfWeek.setDate(new Date().getDate() - new Date().getDay())
      startOfWeek.setHours(0,0,0,0)
      
      const { count: apptCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('starts_at', startOfWeek.toISOString())

      // Recent Conversations
      const { data: recent } = await supabase
        .from('conversations')
        .select('*, contacts(wa_phone, full_name)')
        .eq('organization_id', orgId)
        .order('last_message_at', { ascending: false })
        .limit(5)

      setStats({
        totalConversations: convCount || 0,
        appointmentsThisWeek: apptCount || 0,
        conversionRate: convCount ? Math.round((apptCount || 0 / convCount) * 100) : 0,
      })
      setRecentConversations(recent || [])
      setLoading(false)
    }
    loadDashboardData()
  }, [])

  if (loading) return <div className="p-6 text-center">Cargando Dashboard...</div>

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Panel de Control</h1>
        <p className="text-muted-foreground">Resumen de actividad de tu agente IA</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversaciones (30d)</CardTitle>
            <MessageCircle className="text-muted-foreground" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">+12% vs mes pasado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Citas esta Semana</CardTitle>
            <CalendarCheck className="text-muted-foreground" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.appointmentsThisWeek}</div>
            <p className="text-xs text-muted-foreground">Citas confirmadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <TrendingUp className="text-muted-foreground" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Chat &rarr; Cita</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversaciones Recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentConversations.map(conv => (
              <div 
                key={conv.id} 
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/conversaciones/${conv.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{conv.contacts?.full_name || conv.contacts?.wa_phone}</p>
                    <p className="text-xs text-muted-foreground">{new Date(conv.last_message_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Badge variant={conv.bot_active ? 'default' : 'secondary'}>
                  {conv.bot_active ? 'Bot' : 'Humano'}
                </Badge>
              </div>
            ))}
            {recentConversations.length === 0 && (
              <p className="text-center py-4 text-sm text-muted-foreground">No hay actividad reciente.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/dashboard/citas')}>
              <CalendarCheck size={18} /> Ver Calendario Completo
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/dashboard/personalizacion')}>
              <UserFocus size={18} /> Configurar Agente IA
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/dashboard/conversaciones')}>
              <MessageCircle size={18} /> Gestionar Chats
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'secondary' }) {
  const styles = variant === 'default' 
    ? 'bg-blue-100 text-blue-700' 
    : 'bg-slate-100 text-slate-700';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles}`}>{children}</span>;
}
