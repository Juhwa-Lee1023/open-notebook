'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useSettings, useUpdateSettings } from '@/lib/hooks/use-settings'
import { useEffect, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'

const settingsSchema = z.object({
  default_content_processing_engine_doc: z.enum(['auto', 'docling', 'simple']).optional(),
  default_content_processing_engine_url: z.enum(['simple']).optional(),
  default_embedding_option: z.enum(['ask', 'always', 'never']).optional(),
  internal_connector_embedding_option: z.enum(['ask', 'always', 'never']).optional(),
  auto_delete_files: z.enum(['yes', 'no']).optional(),
  internal_proxy_enabled: z.enum(['yes', 'no']).optional(),
  internal_proxy_url: z.string().optional(),
  internal_proxy_auth_type: z.enum(['none', 'bearer', 'basic']).optional(),
  internal_proxy_username: z.string().optional(),
  internal_proxy_secret: z.string().optional(),
  internal_jira_direct_enabled: z.enum(['yes', 'no']).optional(),
  internal_jira_base_url: z.string().optional(),
  internal_jira_auth_type: z.enum(['none', 'bearer', 'basic']).optional(),
  internal_jira_username: z.string().optional(),
  internal_jira_secret: z.string().optional(),
  internal_confluence_direct_enabled: z.enum(['yes', 'no']).optional(),
  internal_confluence_base_url: z.string().optional(),
  internal_confluence_auth_type: z.enum(['none', 'bearer', 'basic']).optional(),
  internal_confluence_username: z.string().optional(),
  internal_confluence_secret: z.string().optional(),
  internal_connector_timeout_seconds: z.number().int().min(5).max(120).optional(),
  internal_connector_diagnostic_enabled: z.enum(['yes', 'no']).optional(),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export function SettingsForm() {
  const { t } = useTranslation()
  const { data: settings, isLoading, error } = useSettings()
  const updateSettings = useUpdateSettings()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    doc: false,
    url: false,
    embedding: false,
    files: false,
    connectors: false,
  })
  const [hasResetForm, setHasResetForm] = useState(false)
  
  
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty }
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      default_content_processing_engine_doc: undefined,
      default_content_processing_engine_url: undefined,
      default_embedding_option: undefined,
      internal_connector_embedding_option: undefined,
      auto_delete_files: undefined,
      internal_proxy_enabled: undefined,
      internal_proxy_url: undefined,
      internal_proxy_auth_type: undefined,
      internal_proxy_username: undefined,
      internal_proxy_secret: undefined,
      internal_jira_direct_enabled: undefined,
      internal_jira_base_url: undefined,
      internal_jira_auth_type: undefined,
      internal_jira_username: undefined,
      internal_jira_secret: undefined,
      internal_confluence_direct_enabled: undefined,
      internal_confluence_base_url: undefined,
      internal_confluence_auth_type: undefined,
      internal_confluence_username: undefined,
      internal_confluence_secret: undefined,
      internal_connector_timeout_seconds: undefined,
      internal_connector_diagnostic_enabled: undefined,
    }
  })


  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  useEffect(() => {
    if (settings && settings.default_content_processing_engine_doc && !hasResetForm) {
      const formData = {
        default_content_processing_engine_doc: settings.default_content_processing_engine_doc as 'auto' | 'docling' | 'simple',
        default_content_processing_engine_url: 'simple' as const,
        default_embedding_option: settings.default_embedding_option as 'ask' | 'always' | 'never',
        internal_connector_embedding_option:
          (settings.internal_connector_embedding_option as 'ask' | 'always' | 'never') || 'ask',
        auto_delete_files: settings.auto_delete_files as 'yes' | 'no',
        internal_proxy_enabled: (settings.internal_proxy_enabled as 'yes' | 'no') || 'no',
        internal_proxy_url: settings.internal_proxy_url || '',
        internal_proxy_auth_type:
          (settings.internal_proxy_auth_type as 'none' | 'bearer' | 'basic') || 'none',
        internal_proxy_username: settings.internal_proxy_username || '',
        internal_proxy_secret: settings.internal_proxy_secret || '',
        internal_jira_direct_enabled:
          (settings.internal_jira_direct_enabled as 'yes' | 'no') || 'no',
        internal_jira_base_url: settings.internal_jira_base_url || '',
        internal_jira_auth_type:
          (settings.internal_jira_auth_type as 'none' | 'bearer' | 'basic') || 'none',
        internal_jira_username: settings.internal_jira_username || '',
        internal_jira_secret: settings.internal_jira_secret || '',
        internal_confluence_direct_enabled:
          (settings.internal_confluence_direct_enabled as 'yes' | 'no') || 'no',
        internal_confluence_base_url: settings.internal_confluence_base_url || '',
        internal_confluence_auth_type:
          (settings.internal_confluence_auth_type as 'none' | 'bearer' | 'basic') || 'none',
        internal_confluence_username: settings.internal_confluence_username || '',
        internal_confluence_secret: settings.internal_confluence_secret || '',
        internal_connector_timeout_seconds: settings.internal_connector_timeout_seconds || 20,
        internal_connector_diagnostic_enabled:
          (settings.internal_connector_diagnostic_enabled as 'yes' | 'no') || 'no',
      }
      reset(formData)
      setHasResetForm(true)
    }
  }, [hasResetForm, reset, settings])

  const onSubmit = async (data: SettingsFormData) => {
    await updateSettings.mutateAsync(data)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t.settings.loadFailed}</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : t.common.error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.contentProcessing}</CardTitle>
          <CardDescription>
            {t.settings.contentProcessingDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="doc_engine">{t.settings.docEngine}</Label>
            <Controller
              name="default_content_processing_engine_doc"
              control={control}
              render={({ field }) => (
                  <Select
                    key={field.value}
                    name={field.name}
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={field.disabled || isLoading}
                  >
                      <SelectTrigger id="doc_engine" className="w-full">
                        <SelectValue placeholder={t.settings.docEnginePlaceholder} />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t.settings.autoRecommended}</SelectItem>
                      <SelectItem value="docling">{t.settings.docling}</SelectItem>
                      <SelectItem value="simple">{t.settings.simple}</SelectItem>
                    </SelectContent>
                  </Select>
              )}
            />
            <Collapsible open={expandedSections.doc} onOpenChange={() => toggleSection('doc')}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${expandedSections.doc ? 'rotate-180' : ''}`} />
                {t.settings.helpMeChoose}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
                <p>{t.settings.docHelp}</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="url_engine">{t.settings.urlEngine}</Label>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
              {t.settings.simple}
            </div>
             <Collapsible open={expandedSections.url} onOpenChange={() => toggleSection('url')}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${expandedSections.url ? 'rotate-180' : ''}`} />
                {t.settings.helpMeChoose}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
                <p>
                  URL sources are enabled. External URL engines are still forced to Simple mode.
                  For Jira/Confluence pages that require authentication, use the internal connectors below.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>{t.settings.embeddingAndSearch}</CardTitle>
          <CardDescription>
            {t.settings.embeddingAndSearchDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="space-y-3">
            <Label htmlFor="embedding">일반 소스 추가 시 기본 임베딩 옵션</Label>
            <Controller
              name="default_embedding_option"
              control={control}
              render={({ field }) => (
                <Select
                  key={field.value}
                  name={field.name}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={field.disabled || isLoading}
                >
                  <SelectTrigger id="embedding" className="w-full">
                    <SelectValue placeholder={t.settings.embeddingOptionPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ask">{t.settings.ask}</SelectItem>
                    <SelectItem value="always">{t.settings.always}</SelectItem>
                    <SelectItem value="never">{t.settings.never}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
             <Collapsible open={expandedSections.embedding} onOpenChange={() => toggleSection('embedding')}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${expandedSections.embedding ? 'rotate-180' : ''}`} />
                {t.settings.helpMeChoose}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
                <p>{t.settings.embeddingHelp}</p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="space-y-3">
            <Label htmlFor="internal_connector_embedding">Jira/Confluence 연동 시 자동 임베딩 옵션</Label>
            <Controller
              name="internal_connector_embedding_option"
              control={control}
              render={({ field }) => (
                <Select
                  key={field.value}
                  name={field.name}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={field.disabled || isLoading}
                >
                  <SelectTrigger id="internal_connector_embedding" className="w-full">
                    <SelectValue placeholder={t.settings.embeddingOptionPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ask">{t.settings.ask}</SelectItem>
                    <SelectItem value="always">{t.settings.always}</SelectItem>
                    <SelectItem value="never">{t.settings.never}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-sm text-muted-foreground">
              Jira/Confluence URL을 추가할 때 적용됩니다. ask로 두면 추가할 때마다 임베딩 체크 여부를 직접 선택합니다.
            </p>
          </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>{t.settings.fileManagement}</CardTitle>
          <CardDescription>
            {t.settings.fileManagementDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="space-y-3">
            <Label htmlFor="auto_delete">{t.settings.autoDeleteFiles}</Label>
            <Controller
              name="auto_delete_files"
              control={control}
              render={({ field }) => (
                <Select
                  key={field.value}
                  name={field.name}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={field.disabled || isLoading}
                >
                  <SelectTrigger id="auto_delete" className="w-full">
                    <SelectValue placeholder={t.settings.autoDeletePlaceholder} />
                  </SelectTrigger>
                   <SelectContent>
                    <SelectItem value="yes">{t.common.yes}</SelectItem>
                    <SelectItem value="no">{t.common.no}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
             <Collapsible open={expandedSections.files} onOpenChange={() => toggleSection('files')}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${expandedSections.files ? 'rotate-180' : ''}`} />
                {t.settings.helpMeChoose}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
                <p>{t.settings.filesHelp}</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
       </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Internal Jira/Wiki Connectors</CardTitle>
          <CardDescription>
            Configure direct REST connectors and/or internal proxy connector for authenticated Jira and Confluence URLs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="internal_connector_timeout_seconds">Connector timeout (seconds)</Label>
            <Controller
              name="internal_connector_timeout_seconds"
              control={control}
              render={({ field }) => (
                <Input
                  id="internal_connector_timeout_seconds"
                  type="number"
                  min={5}
                  max={120}
                  value={field.value ?? 20}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled={isLoading}
                />
              )}
            />
          </div>

          <div className="space-y-3">
            <Label>Diagnostic logging</Label>
            <Controller
              name="internal_connector_diagnostic_enabled"
              control={control}
              render={({ field }) => (
                <Select value={field.value || 'no'} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{t.common.yes}</SelectItem>
                    <SelectItem value="no">{t.common.no}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-sm text-muted-foreground">
              When enabled, Jira/Confluence connector failures log status, selected response headers,
              and a short JSON/HTML body summary to help diagnose token, permission, or path issues.
            </p>
          </div>

          <div className="rounded-md border p-4 space-y-4">
            <h4 className="font-medium">1) Internal Proxy Connector</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Proxy enabled</Label>
                <Controller
                  name="internal_proxy_enabled"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || 'no'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">{t.common.yes}</SelectItem>
                        <SelectItem value="no">{t.common.no}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Proxy auth type</Label>
                <Controller
                  name="internal_proxy_auth_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || 'none'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="bearer">Bearer</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="internal_proxy_url">Proxy URL</Label>
                <Controller
                  name="internal_proxy_url"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="internal_proxy_url"
                      placeholder="http://internal-proxy.local/fetch"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal_proxy_username">Proxy username</Label>
                <Controller
                  name="internal_proxy_username"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="internal_proxy_username"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal_proxy_secret">Proxy secret/token</Label>
                <Controller
                  name="internal_proxy_secret"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="internal_proxy_secret"
                      type="password"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4 space-y-4">
            <h4 className="font-medium">2) Direct Jira REST Connector</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Jira direct enabled</Label>
                <Controller
                  name="internal_jira_direct_enabled"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || 'no'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">{t.common.yes}</SelectItem>
                        <SelectItem value="no">{t.common.no}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Jira auth type</Label>
                <Controller
                  name="internal_jira_auth_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || 'none'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="bearer">Bearer</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="internal_jira_base_url">Jira base URL</Label>
                <Controller
                  name="internal_jira_base_url"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="internal_jira_base_url"
                      placeholder="http://10.40.132.193"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal_jira_username">Jira username</Label>
                <Controller
                  name="internal_jira_username"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="internal_jira_username"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal_jira_secret">Jira secret/token</Label>
                <Controller
                  name="internal_jira_secret"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="internal_jira_secret"
                      type="password"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4 space-y-4">
            <h4 className="font-medium">3) Direct Confluence REST Connector</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Confluence direct enabled</Label>
                <Controller
                  name="internal_confluence_direct_enabled"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || 'no'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">{t.common.yes}</SelectItem>
                        <SelectItem value="no">{t.common.no}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Confluence auth type</Label>
                <Controller
                  name="internal_confluence_auth_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || 'none'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="bearer">Bearer</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="internal_confluence_base_url">Confluence base URL</Label>
                <Controller
                  name="internal_confluence_base_url"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="internal_confluence_base_url"
                      placeholder="http://10.40.132.191"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal_confluence_username">Confluence username</Label>
                <Controller
                  name="internal_confluence_username"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="internal_confluence_username"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal_confluence_secret">Confluence secret/token</Label>
                <Controller
                  name="internal_confluence_secret"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="internal_confluence_secret"
                      type="password"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <Collapsible open={expandedSections.connectors} onOpenChange={() => toggleSection('connectors')}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${expandedSections.connectors ? 'rotate-180' : ''}`} />
              {t.settings.helpMeChoose}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
              <p>
                For corporate Jira/wiki pages, direct REST mode is recommended first.
                Keep proxy mode enabled as fallback when network routing or SSO rules require an internal gateway.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <div className="flex justify-end">
         <Button 
          type="submit" 
          disabled={!isDirty || updateSettings.isPending}
        >
          {updateSettings.isPending ? t.common.saving : t.navigation.settings}
        </Button>
      </div>
    </form>
  )
}
