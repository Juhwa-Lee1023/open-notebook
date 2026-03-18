'use client'

import { ShieldAlert } from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useTranslation } from '@/lib/hooks/use-translation'

export default function PodcastsPage() {
  const { t } = useTranslation()

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            <AlertTitle>{t.navigation.podcasts}</AlertTitle>
            <AlertDescription>
              Podcast generation is disabled by security hardening because it can
              trigger non-LLM external network communication.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </AppShell>
  )
}
