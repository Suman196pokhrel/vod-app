export const isResumableUploadsEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_UPLOADS_TUS_ENABLED === "true"
