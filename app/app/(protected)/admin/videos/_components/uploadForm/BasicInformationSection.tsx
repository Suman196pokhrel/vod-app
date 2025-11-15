// app/admin/videos/_components/uploadForm/BasicInformationSection.tsx
"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

interface BasicInformationSectionProps {
  form: UseFormReturn<VideoFormData>
}

const BasicInformationSection = ({ form }: BasicInformationSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title */}
        <Field>
          <FieldLabel htmlFor="title">Title *</FieldLabel>
          <FieldGroup>
            <Input
              id="title"
              placeholder="Enter video title"
              {...form.register('title')}
            />
          </FieldGroup>
          {form.formState.errors.title && (
            <FieldError>{form.formState.errors.title.message}</FieldError>
          )}
        </Field>

        {/* Description */}
        <Field>
          <FieldLabel htmlFor="description">Description *</FieldLabel>
          <FieldGroup>
            <Textarea
              id="description"
              placeholder="Enter video description"
              rows={5}
              {...form.register('description')}
            />
          </FieldGroup>
          {form.formState.errors.description && (
            <FieldError>{form.formState.errors.description.message}</FieldError>
          )}
        </Field>

        {/* Category & Duration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <Field>
            <FieldLabel htmlFor="category">Category *</FieldLabel>
            <FieldGroup>
              <Controller
                name="category"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="action">Action</SelectItem>
                      <SelectItem value="drama">Drama</SelectItem>
                      <SelectItem value="comedy">Comedy</SelectItem>
                      <SelectItem value="scifi">Sci-Fi</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="documentary">Documentary</SelectItem>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="horror">Horror</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldGroup>
            {form.formState.errors.category && (
              <FieldError>{form.formState.errors.category.message}</FieldError>
            )}
          </Field>

          {/* Duration */}
          <Field>
            <FieldLabel htmlFor="duration">Duration (e.g., 2h 15m)</FieldLabel>
            <FieldGroup>
              <Input
                id="duration"
                placeholder="1h 30m"
                {...form.register('duration')}
              />
            </FieldGroup>
            {form.formState.errors.duration && (
              <FieldError>{form.formState.errors.duration.message}</FieldError>
            )}
          </Field>
        </div>

        {/* Age Rating & Release Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Age Rating */}
          <Field>
            <FieldLabel htmlFor="ageRating">Age Rating</FieldLabel>
            <FieldGroup>
              <Controller
                name="ageRating"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G">G - General Audiences</SelectItem>
                      <SelectItem value="PG">PG - Parental Guidance</SelectItem>
                      <SelectItem value="PG-13">PG-13</SelectItem>
                      <SelectItem value="R">R - Restricted</SelectItem>
                      <SelectItem value="TV-14">TV-14</SelectItem>
                      <SelectItem value="TV-MA">TV-MA - Mature</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldGroup>
            {form.formState.errors.ageRating && (
              <FieldError>{form.formState.errors.ageRating.message}</FieldError>
            )}
          </Field>

          {/* Release Date */}
          <Field>
            <FieldLabel htmlFor="releaseDate">Release Date</FieldLabel>
            <FieldGroup>
              <Input
                id="releaseDate"
                type="date"
                {...form.register('releaseDate')}
              />
            </FieldGroup>
            {form.formState.errors.releaseDate && (
              <FieldError>{form.formState.errors.releaseDate.message}</FieldError>
            )}
          </Field>
        </div>
      </CardContent>
    </Card>
  )
}

export default BasicInformationSection