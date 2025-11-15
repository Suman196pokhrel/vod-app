// app/admin/videos/_components/uploadForm/TagInput.tsx
"use client"

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { UseFormReturn } from 'react-hook-form'
import { VideoFormData } from './formSchema'

interface TagInputProps {
  form: UseFormReturn<VideoFormData>
}

const TagInput = ({ form }: TagInputProps) => {
  const [tagInput, setTagInput] = useState('')
  const currentTags = form.watch('tags') || []

  const handleAddTag = () => {
    if (tagInput.trim() && !currentTags.includes(tagInput.trim())) {
      form.setValue('tags', [...currentTags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove))
  }

  return (
    <Field>
      <FieldLabel htmlFor="tags">Tags</FieldLabel>
      <div className="flex gap-2">
        <Input
          id="tags"
          placeholder="Add a tag"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddTag()
            }
          }}
        />
        <Button type="button" onClick={handleAddTag} variant="secondary">
          Add
        </Button>
      </div>
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {currentTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {form.formState.errors.tags && (
        <FieldError>{form.formState.errors.tags.message}</FieldError>
      )}
    </Field>
  )
}

export default TagInput