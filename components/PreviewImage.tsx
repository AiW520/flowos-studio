'use client'

import { useState, type ImgHTMLAttributes } from 'react'
import { ImageOff } from 'lucide-react'

type PreviewImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string }

export function PreviewImage(props: PreviewImageProps) {
  return <ImageState key={props.src} {...props} />
}

function ImageState({ alt = '', onError, onLoad, ...props }: PreviewImageProps) {
  const [failed, setFailed] = useState(false)
  if (failed || !props.src) return <span role="img" aria-label={alt ? `${alt}：预览不可用` : '预览不可用'} className="flex h-full w-full items-center justify-center bg-[var(--surface2)] text-[var(--muted)]"><ImageOff size={22} aria-hidden="true" /></span>
  return <img {...props} alt={alt} decoding="async" onLoad={onLoad} onError={(event) => { setFailed(true); onError?.(event) }} />
}
