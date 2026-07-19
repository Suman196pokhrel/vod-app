"use client"

import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"

import { updateVideoDetails } from "@/lib/apis/video"
import { Video } from "@/lib/types/video"
import { editVideoSchema, type EditVideoFormData } from "./editVideoSchema"

interface EditVideoDialogProps {
  video: Video
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Same option lists as the upload form (BasicInformationSection /
// PublishingSection) — kept in sync manually since editing reuses the same
// vocabulary as creation, not a shared source of truth (out of scope here).
const CATEGORIES = [
  ["action", "Action"], ["drama", "Drama"], ["comedy", "Comedy"],
  ["scifi", "Sci-Fi"], ["thriller", "Thriller"], ["documentary", "Documentary"],
  ["fantasy", "Fantasy"], ["horror", "Horror"],
] as const

const AGE_RATINGS = [
  ["G", "G - General Audiences"], ["PG", "PG - Parental Guidance"],
  ["PG-13", "PG-13"], ["R", "R - Restricted"],
  ["TV-14", "TV-14"], ["TV-MA", "TV-MA - Mature"],
] as const

const STATUSES = [
  ["draft", "Draft - Save for later"],
  ["published", "Published - Go live immediately"],
  ["scheduled", "Scheduled - Set publish date"],
] as const

const videoToFormData = (video: Video): EditVideoFormData => ({
  title: video.title,
  description: video.description ?? "",
  category: video.category,
  ageRating: video.age_rating ?? undefined,
  director: video.director ?? "",
  cast: (video.cast ?? []).join(", "),
  releaseDate: video.release_date ?? "",
  status: video.status,
  tags: video.tags ?? [],
})

export function EditVideoDialog({ video, open, onOpenChange }: EditVideoDialogProps) {
  const queryClient = useQueryClient()
  const [tagInput, setTagInput] = useState("")

  const form = useForm<EditVideoFormData>({
    resolver: zodResolver(editVideoSchema),
    defaultValues: videoToFormData(video),
  })

  // Re-sync the form to the current row data every time the dialog opens —
  // it stays mounted between opens (one instance per table row), so without
  // this a second edit would still show whatever was typed/submitted first.
  useEffect(() => {
    if (open) form.reset(videoToFormData(video))
  }, [open, video, form])

  const mutation = useMutation({
    mutationFn: (data: EditVideoFormData) =>
      updateVideoDetails(video.id, {
        title: data.title,
        description: data.description,
        category: data.category,
        age_rating: data.ageRating,
        release_date: data.releaseDate || undefined,
        director: data.director,
        cast: data.cast,
        tags: data.tags,
        status: data.status,
      }),
    onSuccess: (updated) => {
      toast.success(`"${updated.title}" updated`)
      queryClient.invalidateQueries({ queryKey: ["getAllVideosAdmin"] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      console.error("[EditVideoDialog] update failed", { videoId: video.id, error })
      toast.error(error.message || "Failed to update video")
    },
  })

  const tags = form.watch("tags") ?? []

  const addTag = () => {
    const value = tagInput.trim()
    if (value && !tags.includes(value)) {
      form.setValue("tags", [...tags, value])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    form.setValue("tags", tags.filter((t) => t !== tag))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{`Edit "${video.title}"`}</DialogTitle>
          <DialogDescription>
            Update this video's metadata. Changes are saved immediately and reflected
            across the site — this doesn't touch the video or thumbnail files.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-video-form"
          onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
        >
          <Field>
            <FieldLabel htmlFor="edit-title">Title</FieldLabel>
            <FieldGroup>
              <Input id="edit-title" {...form.register("title")} />
            </FieldGroup>
            {form.formState.errors.title && (
              <FieldError>{form.formState.errors.title.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-description">Description</FieldLabel>
            <FieldGroup>
              <Textarea id="edit-description" rows={4} {...form.register("description")} />
            </FieldGroup>
            {form.formState.errors.description && (
              <FieldError>{form.formState.errors.description.message}</FieldError>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="edit-category">Category</FieldLabel>
              <FieldGroup>
                <Controller
                  name="category"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="edit-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FieldGroup>
              {form.formState.errors.category && (
                <FieldError>{form.formState.errors.category.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-age-rating">Age Rating</FieldLabel>
              <FieldGroup>
                <Controller
                  name="ageRating"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="edit-age-rating">
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_RATINGS.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FieldGroup>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="edit-director">Director / Creator</FieldLabel>
              <FieldGroup>
                <Input id="edit-director" {...form.register("director")} />
              </FieldGroup>
              {form.formState.errors.director && (
                <FieldError>{form.formState.errors.director.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-release-date">Release Date</FieldLabel>
              <FieldGroup>
                <Input id="edit-release-date" type="date" {...form.register("releaseDate")} />
              </FieldGroup>
              {form.formState.errors.releaseDate && (
                <FieldError>{form.formState.errors.releaseDate.message}</FieldError>
              )}
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="edit-cast">Cast (comma-separated)</FieldLabel>
            <FieldGroup>
              <Input id="edit-cast" placeholder="Actor 1, Actor 2, Actor 3" {...form.register("cast")} />
            </FieldGroup>
            {form.formState.errors.cast && (
              <FieldError>{form.formState.errors.cast.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-tags">Tags</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="edit-tags"
                placeholder="Add a tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                      aria-label={`Remove tag ${tag}`}
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

          <Field>
            <FieldLabel htmlFor="edit-status">Status</FieldLabel>
            <FieldGroup>
              <Controller
                name="status"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldGroup>
            {form.formState.errors.status && (
              <FieldError>{form.formState.errors.status.message}</FieldError>
            )}
          </Field>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-video-form" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
