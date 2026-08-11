export const getWebVideoMeta = (file: File): Promise<{ duration: number; thumbnail: string }> =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = objectUrl

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
      video.load()
    }

    video.onloadeddata = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 320
        canvas.height = video.videoHeight || 180
        const ctx = canvas.getContext('2d')
        let thumbnail = ''
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          thumbnail = canvas.toDataURL('image/jpeg', 0.82)
        }
        resolve({
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          thumbnail,
        })
      } finally {
        cleanup()
      }
    }

    video.onerror = () => {
      cleanup()
      resolve({ duration: 0, thumbnail: '' })
    }
  })
