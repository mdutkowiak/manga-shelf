import { toast } from 'sonner'

export function toastSuccess(message: string, description?: string) {
  toast.success(message, { description, duration: 3000 })
}

export function toastError(message: string, description?: string) {
  toast.error(message, { description, duration: 4000 })
}

export function toastInfo(message: string, description?: string) {
  toast(message, { description, duration: 2500 })
}

export function hapticFeedback(pattern: number | number[] = 50) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  }
}
