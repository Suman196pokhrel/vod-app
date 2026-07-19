export interface VideoData {
  id: string
  title: string
  thumbnail_url?: string | null
  manifest_url?: string | null
}

export interface QualityLevel {
  index: number
  height: number
}