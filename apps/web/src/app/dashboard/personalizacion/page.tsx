"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function PersonalizationPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({
    system_prompt: '',
    tone: 'profesional y cálido',
    business_info: {},
    services: [],
    business_hours: {},
  })

  useEffect(() => {
    async function loadConfig() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('agent_configs')
        .select('*')
        .eq('organization_id', user?.user_metadata?.organization_id)
        .single()

      if (data) setConfig(data)
    }
    loadConfig()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('agent_configs')
        .upsert({
          organization_id: user?.user_metadata?.organization_id,
          ...config,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
      toast.success('Configuración actualizada')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Personalización del Agente</h1>
        <p className="text-muted-foreground">Define la personalidad y el conocimiento de tu IA.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Personalidad y Tono</CardTitle>
            <CardDescription>Cómo debe interactuar el bot con los pacientes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>System Prompt (Instrucciones Maestras)</Label>
              <Textarea 
                className="min-h-[200px]" 
                value={config.system_prompt} 
                onChange={(e) => setConfig({...config, system_prompt: e.target.value})}
                placeholder="Ej: Eres el asistente de la Clínica Dental Sonrisas. Tu objetivo es agendar citas..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tono de Voz</Label>
              <Input 
                value={config.tone} 
                onChange={(e) => setConfig({...config, tone: e.target.value})}
                placeholder="Ej: Profesional, cercano, empático..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Negocio</CardTitle>
            <CardDescription>Datos que la IA usará para responder preguntas frecuentes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              className="font-mono text-sm"
              value={JSON.stringify(config.business_info, null, 2)} 
              onChange={(e) => {
                try { setConfig({...config, business_info: JSON.parse(e.target.value)}) } catch {}
              }}
              placeholder='{ "direccion": "Calle 123", "faq": "Aceptamos seguros..." }'
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Servicios y Precios</CardTitle>
            <CardDescription>Lista de servicios que la IA puede ofrecer y agendar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              className="font-mono text-sm"
              value={JSON.stringify(config.services, null, 2)} 
              onChange={(e) => {
                try { setConfig({...config, services: JSON.parse(e.target.value)}) } catch {}
              }}
              placeholder='[ { "name": "Limpieza", "duration": 30, "description": "Limpieza profunda" } ]'
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </form>
    </div>
  )
}
