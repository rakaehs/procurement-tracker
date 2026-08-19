'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { FileText, Upload, Download, Eye } from 'lucide-react'

interface DocumentManagerProps {
  entityType: 'po' | 'invoice' | 'payment'
  entityId: string
  existingDocUrl?: string | null
  existingFileName?: string | null
  onUploadComplete?: () => void
}

export default function DocumentManager({
  entityType,
  entityId,
  existingDocUrl,
  existingFileName,
  onUploadComplete
}: DocumentManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [fileUrl, setFileUrl] = useState(existingDocUrl)
  const [fileName, setFileName] = useState(existingFileName)
  const supabase = createClient()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      if (!file) return

      if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran file melebihi batas maksimum 10 MB.')
        return
      }

      const fileExt = file.name.split('.').pop()
      const pathFileName = `${entityType}-${entityId}-${Date.now()}.${fileExt}`
      const filePath = `${entityType}s/${pathFileName}`

      const { error: uploadError } = await supabase.storage
        .from('procurement_documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { error: dbError } = await supabase.from('documents').upsert({
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_url: filePath,
        file_size: file.size,
      }, { onConflict: 'entity_id' })

      if (dbError) throw dbError

      setFileUrl(filePath)
      setFileName(file.name)
      if (onUploadComplete) onUploadComplete()
      alert('Dokumen berhasil diunggah!')
    } catch (error: any) {
      alert(`Gagal mengunggah dokumen: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handlePreviewDownload = async (action: 'preview' | 'download') => {
    if (!fileUrl) return
    try {
      const { data, error } = await supabase.storage
        .from('procurement_documents')
        .createSignedUrl(fileUrl, 60)

      if (error) throw error

      if (action === 'preview') {
        window.open(data.signedUrl, '_blank')
      } else {
        const link = document.createElement('a')
        link.href = data.signedUrl
        link.download = fileName || 'document'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error: any) {
      alert(`Gagal mengakses dokumen: ${error.message}`)
    }
  }

  return (
    <div className="flex items-center justify-between border p-3 rounded-lg bg-gray-50">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-blue-600" />
        <div>
          <p className="text-sm font-medium text-gray-800">{fileName || 'Belum ada dokumen terlampir'}</p>
          <p className="text-xs text-gray-500 capitalize">{entityType} Attachment (Max 10MB)</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {fileUrl ? (
          <>
            <Button size="sm" variant="outline" onClick={() => handlePreviewDownload('preview')}>
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
            <Button size="sm" variant="outline" onClick={() => handlePreviewDownload('download')}>
              <Download className="w-4 h-4 mr-1" /> Download
            </Button>
          </>
        ) : null}

        <label className="cursor-pointer">
          <Button size="sm" variant={fileUrl ? 'secondary' : 'default'} disabled={uploading} asChild>
            <span>
              <Upload className="w-4 h-4 mr-1" /> {uploading ? 'Uploading...' : fileUrl ? 'Replace' : 'Upload'}
            </span>
          </Button>
          <input 
            type="file" 
            className="hidden" 
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" 
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  )
}