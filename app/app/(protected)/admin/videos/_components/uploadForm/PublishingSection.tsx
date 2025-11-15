// app/admin/videos/_components/uploadForm/PublishingSection.tsx
"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field'
import { Controller, UseFormReturn } from 'react-hook-form'
import { VideoFormData } from './formSchema'

interface PublishingSectionProps {
  form: UseFormReturn<VideoFormData>
}

const PublishingSection = ({ form }: PublishingSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publishing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field>
          <FieldLabel htmlFor="status">Status</FieldLabel>
          <FieldGroup>
            <Controller
              name="status"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft - Save for later</SelectItem>
                    <SelectItem value="published">Published - Go live immediately</SelectItem>
                    <SelectItem value="scheduled">Scheduled - Set publish date</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FieldGroup>
          {form.formState.errors.status && (
            <FieldError>{form.formState.errors.status.message}</FieldError>
          )}
        </Field>
      </CardContent>
    </Card>
  )
}

export default PublishingSection