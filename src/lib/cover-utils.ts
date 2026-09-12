export function getCoverUrl(url: string | null | undefined): string {
  if (!url) return '/api/covers?url=https%3A%2F%2Fs4.anilist.co%2Ffile%2Fanilistcdn%2Fmedia%2Fmanga%2Fcover%2Flarge%2Fbx30012-7Uo49q0iX6qX.jpg'
  if (url.startsWith('/api/covers') || url.startsWith('data:')) return url
  return `/api/covers?url=${encodeURIComponent(url)}`
}
