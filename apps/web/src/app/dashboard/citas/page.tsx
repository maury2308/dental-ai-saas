"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon } from '@phosphor-icons/react'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadAppointments() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', user?.user_metadata?.organization_id)
        .order('starts_at', { ascending: true })
      
      if (data) setAppointments(data)
      setLoading(false)
    }
    loadAppointments()
  }, [])

  if (loading) return <div className="p-6 text-center">Cargando citas...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarIcon size={32} /> Agenda de Citas
        </h1>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Fecha y Hora</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Paciente Nuevo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((apt) => (
              <TableRow key={apt.id}>
                <TableCell className="font-medium">{apt.full_name}</TableCell>
                <TableCell>{apt.service}</TableCell>
                <TableCell>
                  {new Date(apt.starts_at).toLocaleString('es-MX', { 
                    dateStyle: 'medium', 
                    timeStyle: 'short' 
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                    {apt.status}
                  </Badge>
                </TableCell>
                <TableCell>{apt.is_new_patient ? 'Sí' : 'No'}</TableCell>
              </TableRow>
            ))}
            {appointments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No hay citas agendadas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
