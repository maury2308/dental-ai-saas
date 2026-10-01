"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner' // Assuming sonner is installed or used as standard shadcn toast

export default function IntegrationsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // WhatsApp State
  const [waConfig, setWaConfig] = useState({
    phone_number_id: '',
    waba_id: '',
    access_token: '',
    verify_token: '',
    app_secret: '',
  })

  async function saveWhatsAppConfig(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Note: In a real app, we would encrypt the tokens on the server.
      // For this phase, we send them to a server action or API route that handles encryption.
      const { error } = await supabase.from('whatsapp_configs').upsert({
        organization_id: (await supabase.auth.getUser()).data.user?.user_metadata?.organization_id,
        phone_number_id: waConfig.phone_number_id,
        waba_id: waConfig.waba_id,
        access_token_encrypted: waConfig.access_token, // Logic to encrypt will be in the server action
        verify_token: waConfig.verify_token,
        app_secret_encrypted: waConfig.app_secret,
      })

      if (error) throw error
      toast.success('Configuración de WhatsApp guardada')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Integraciones</h1>
      <p className="text-muted-foreground">Conecta tus servicios externos para habilitar el agente IA.</p>

      <div className="grid gap-6 md:grid-cols-2">
        {/* WhatsApp Integration */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Cloud API</CardTitle>
            <CardDescription>Configura los accesos de Meta Graph API v25.0</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveWhatsAppConfig} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number ID</label>
                <Input 
                  value={waConfig.phone_number_id} 
                  onChange={(e) => setWaConfig({...waConfig, phone_number_id: e.target.value})}
                  placeholder="ID del número de teléfono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">WABA ID</label>
                <Input 
                  value={waConfig.waba_id} 
                  onChange={(e) => setWaConfig({...waConfig, waba_id: e.target.value})}
                  placeholder="WhatsApp Business Account ID"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">System User Access Token</label>
                <Input 
                  type="password"
                  value={waConfig.access_token} 
                  onChange={(e) => setWaConfig({...waConfig, access_token: e.target.value})}
                  placeholder="Token de acceso"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Verify Token</label>
                <Input 
                  value={waConfig.verify_token} 
                  onChange={(e) => setWaConfig({...waConfig, verify_token: e.target.value})}
                  placeholder="Token de verificación del webhook"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">App Secret</label>
                <Input 
                  type="password"
                  value={waConfig.app_secret} 
                  onChange={(e) => setWaConfig({...waConfig, app_secret: e.target.value})}
                  placeholder="Secreto de la App de Meta"
                />
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={saveWhatsAppConfig} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </CardFooter>
        </Card>

        {/* Google Calendar Integration */}
        <Card>
          <CardHeader>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>Sincroniza las citas con tu calendario de Google</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Conecta tu cuenta de Google para permitir que la IA gestione tus citas.
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/api/auth/google'}>
              Conectar con Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
