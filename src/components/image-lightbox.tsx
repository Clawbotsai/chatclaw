'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export function ImageLightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIndex(i => Math.min(images.length - 1, i + 1))
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [images.length, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
        <X size={28} />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 disabled:opacity-20 z-10"
          >
            <ChevronLeft size={36} />
          </button>
          <button
            onClick={() => setIndex(i => Math.min(images.length - 1, i + 1))}
            disabled={index === images.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 disabled:opacity-20 z-10"
          >
            <ChevronRight size={36} />
          </button>
        </>
      )}

      <img
        src={images[index]}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <p className="absolute bottom-4 text-white text-sm">{index + 1} / {images.length}</p>
      )}
    </div>
  )
}
