"use client"

import { useMemo, useState } from "react"
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  useWatch,
} from "react-hook-form"
import { FileIcon, FileTextIcon, LinkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useTranslation } from "@/lib/hooks/use-translation"
import { TranslationKeys } from "@/lib/locales"

interface CreateSourceFormData {
  type: "link" | "upload" | "text"
  title?: string
  url?: string
  content?: string
  file?: FileList | File
  notebooks?: string[]
  transformations?: string[]
  embed: boolean
  async_processing: boolean
}

const MAX_BATCH_SIZE = 50

function parseUrls(text: string): string[] {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function parseAndValidateUrls(text: string): {
  valid: string[]
  invalid: { url: string; line: number }[]
} {
  const lines = text.split("\n")
  const valid: string[] = []
  const invalid: { url: string; line: number }[] = []

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (trimmed.length === 0) return

    if (validateUrl(trimmed)) {
      valid.push(trimmed)
    } else {
      invalid.push({ url: trimmed, line: index + 1 })
    }
  })

  return { valid, invalid }
}

const getSourceTypes = (t: TranslationKeys) => [
  {
    value: "link" as const,
    label: t.sources.addUrl,
    icon: LinkIcon,
    description: t.sources.processDescription,
  },
  {
    value: "upload" as const,
    label: t.sources.uploadFile,
    icon: FileIcon,
    description: t.sources.processDescription,
  },
  {
    value: "text" as const,
    label: t.sources.enterText,
    icon: FileTextIcon,
    description: t.sources.processDescription,
  },
]

interface SourceTypeStepProps {
  control: Control<CreateSourceFormData>
  register: UseFormRegister<CreateSourceFormData>
  setValue: UseFormSetValue<CreateSourceFormData>
  errors: FieldErrors<CreateSourceFormData>
  urlValidationErrors?: { url: string; line: number }[]
  onClearUrlErrors?: () => void
}

export function SourceTypeStep({
  control,
  register,
  setValue,
  errors,
  urlValidationErrors,
  onClearUrlErrors,
}: SourceTypeStepProps) {
  const { t } = useTranslation()
  const selectedType = useWatch({ control, name: "type" })
  const urlInput = useWatch({ control, name: "url" })
  const fileInput = useWatch({ control, name: "file" })
  const [hasHtmlContent, setHasHtmlContent] = useState(false)

  const handleTextPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const htmlContent = event.clipboardData.getData("text/html")

    if (htmlContent) {
      event.preventDefault()
      const textarea = event.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentValue = textarea.value
      const newValue =
        currentValue.substring(0, start) +
        htmlContent +
        currentValue.substring(end)
      setValue("content", newValue, { shouldValidate: true })
      setHasHtmlContent(true)
    } else {
      setHasHtmlContent(false)
    }
  }

  const { isBatchMode, itemCount, urlCount, fileCount } = useMemo(() => {
    let nextUrlCount = 0
    let nextFileCount = 0

    if (selectedType === "link" && urlInput) {
      nextUrlCount = parseUrls(urlInput).length
    }

    if (selectedType === "upload" && fileInput) {
      const fileList = fileInput as FileList
      nextFileCount = fileList?.length || 0
    }

    const nextIsBatchMode = nextUrlCount > 1 || nextFileCount > 1
    const nextItemCount = selectedType === "link" ? nextUrlCount : nextFileCount

    return {
      isBatchMode: nextIsBatchMode,
      itemCount: nextItemCount,
      urlCount: nextUrlCount,
      fileCount: nextFileCount,
    }
  }, [fileInput, selectedType, urlInput])

  const isOverLimit = itemCount > MAX_BATCH_SIZE

  return (
    <div className="space-y-6">
      <FormSection
        title={t.sources.title}
        description={t.sources.processDescription}
      >
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Tabs
              value={field.value || ""}
              onValueChange={value => field.onChange(value as "link" | "upload" | "text")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                {getSourceTypes(t).map(type => {
                  const Icon = type.icon
                  return (
                    <TabsTrigger key={type.value} value={type.value} className="gap-2">
                      <Icon className="h-4 w-4" />
                      {type.label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {getSourceTypes(t).map(type => (
                <TabsContent key={type.value} value={type.value} className="mt-4">
                  <p className="mb-4 text-sm text-muted-foreground">{type.description}</p>

                  {type.value === "link" && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Label htmlFor="url">{t.sources.urlLabel}</Label>
                        {urlCount > 0 && (
                          <Badge variant={isOverLimit ? "destructive" : "secondary"}>
                            {t.sources.urlsCount.replace("{count}", urlCount.toString())}
                            {isOverLimit &&
                              ` (${t.sources.maxItems.replace("{count}", MAX_BATCH_SIZE.toString())})`}
                          </Badge>
                        )}
                      </div>
                      <Textarea
                        id="url"
                        {...register("url", {
                          onChange: () => onClearUrlErrors?.(),
                        })}
                        placeholder={t.sources.enterUrlsPlaceholder}
                        rows={urlCount > 1 ? 6 : 2}
                        className="font-mono text-sm"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.sources.batchUrlHint}
                      </p>
                      {errors.url && (
                        <p className="mt-1 text-sm text-destructive">{errors.url.message}</p>
                      )}
                      {urlValidationErrors && urlValidationErrors.length > 0 && (
                        <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/10 p-3">
                          <p className="mb-2 text-sm font-medium text-destructive">
                            {t.sources.invalidUrlsDetected}
                          </p>
                          <ul className="space-y-1">
                            {urlValidationErrors.map((error, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-destructive">
                                <span className="rounded bg-destructive/20 px-1 font-mono">
                                  {t.sources.lineLabel.replace("{line}", error.line.toString())}
                                </span>
                                <span className="truncate">{error.url}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {t.sources.fixInvalidUrls}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {type.value === "upload" && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Label htmlFor="file">{t.sources.fileLabel}</Label>
                        {fileCount > 0 && (
                          <Badge variant={isOverLimit ? "destructive" : "secondary"}>
                            {t.sources.filesCount.replace("{count}", fileCount.toString())}
                            {isOverLimit &&
                              ` (${t.sources.maxItems.replace("{count}", MAX_BATCH_SIZE.toString())})`}
                          </Badge>
                        )}
                      </div>
                      <Input
                        id="file"
                        type="file"
                        multiple
                        {...register("file")}
                        accept=".pdf,.doc,.docx,.pptx,.ppt,.xlsx,.xls,.txt,.md,.epub,.jpg,.jpeg,.png,.tiff,.zip,.tar,.gz,.html"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.sources.selectMultipleFilesHint}
                      </p>
                      {fileCount > 1 && fileInput instanceof FileList && (
                        <div className="mt-2 rounded-md bg-muted p-3">
                          <p className="mb-2 text-xs font-medium">{t.sources.selectedFiles}</p>
                          <div className="max-h-32 space-y-1 overflow-y-auto">
                            {Array.from(fileInput).map((file, idx) => (
                              <div key={`${file.name}-${idx}`} className="text-xs text-muted-foreground">
                                {file.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {isBatchMode && !isOverLimit && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {selectedType === "upload"
                            ? t.sources.batchFilesHint.replace("{count}", fileCount.toString())
                            : t.sources.batchUrlHint}
                        </p>
                      )}
                      {errors.file && (
                        <p className="mt-1 text-sm text-destructive">{String(errors.file.message)}</p>
                      )}
                    </div>
                  )}

                  {type.value === "text" && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">{t.sources.title}</Label>
                        <Input
                          id="title"
                          {...register("title")}
                          placeholder={t.sources.titlePlaceholder}
                          className="mt-2"
                        />
                        {errors.title && (
                          <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="content">{t.sources.content}</Label>
                        <Textarea
                          id="content"
                          {...register("content")}
                          placeholder={t.sources.contentPlaceholder}
                          rows={10}
                          className="mt-2"
                          onPaste={handleTextPaste}
                        />
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {hasHtmlContent ? t.sources.htmlPreserved : t.sources.htmlPasteHint}
                          </p>
                        </div>
                        {errors.content && (
                          <p className="mt-1 text-sm text-destructive">{errors.content.message}</p>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        />
      </FormSection>
    </div>
  )
}
