// app/admin/videos/_components/uploadForm/AdditionalDetailsSection.tsx
"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field'
import { UseFormReturn } from 'react-hook-form'
import { VideoFormData } from './formSchema'
import TagInput from './TagInput'

interface AdditionalDetailsSectionProps {
  form: UseFormReturn<VideoFormData>
}

const AdditionalDetailsSection = ({ form }: AdditionalDetailsSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Director */}
        <Field>
          <FieldLabel htmlFor="director">Director / Creator</FieldLabel>
          <FieldGroup>
            <Input
              id="director"
              placeholder="Enter director name"
              {...form.register('director')}
            />
          </FieldGroup>
          {form.formState.errors.director && (
            <FieldError>{form.formState.errors.director.message}</FieldError>
          )}
        </Field>

        {/* Cast */}
        <Field>
          <FieldLabel htmlFor="cast">Cast (comma-separated)</FieldLabel>
          <FieldGroup>
            <Input
              id="cast"
              placeholder="Actor 1, Actor 2, Actor 3"
              {...form.register('cast')}
            />
          </FieldGroup>
          {form.formState.errors.cast && (
            <FieldError>{form.formState.errors.cast.message}</FieldError>
          )}
        </Field>

        {/* Tags */}
        <TagInput form={form} />
      </CardContent>
    </Card>
  )
}

export default AdditionalDetailsSection