"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function OnboardingPage() {
  const [orgName, setOrgName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleOnboarding(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Usuario no autenticado')

      // 1. Create Organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName, slug })
        .select()
        .single()

      if (orgError) throw orgError

      // 2. Create Profile and link to Organization
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          organization_id: org.id,
          role: 'owner',
        })

      if (profileError) throw profileError

      // Note: In a real production app, we would trigger an Edge Function here
      // to set the organization_id in the user's JWT claims (app_metadata).
      
      router.push('/dashboard')
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Configura tu Negocio</h1>
          <p className="text-muted-foreground">Crea tu organización para empezar</p>
        </div>
        <form onSubmit={handleOnboarding} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre de la Clínica</label>
            <Input 
              value={orgName} 
              onChange={(e) => setOrgName(e.target.value)} 
              placeholder="Clínica Dental Sonrisas"
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">URL personalizada (slug)</label>
            <Input 
              value={slug} 
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
              placeholder="sonrisas-dental"
              required 
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creando...' : 'Finalizar Setup'}
          </Button>
        </form>
      </div>
    </div>
  )
}
