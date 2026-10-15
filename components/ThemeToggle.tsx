'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

const THEME_KEY = 'flowos:theme'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    let saved: string | null = null
    try { saved = window.localStorage.getItem(THEME_KEY) } catch { /* Browser storage can be disabled. */ }
    const initial: Theme = saved === 'light' || saved === 'dark'
      ? saved
      : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    setTheme(initial)
    applyTheme(initial)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    try {
      window.localStorage.setItem(THEME_KEY, next)
    } catch {
      // Theme changes still apply when storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#8e98a8] hover:bg-[#20242b] hover:text-white ${className}`}
      aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
      title={theme === 'dark' ? '浅色主题' : '深色主题'}
    >
      {theme === 'dark' ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
    </button>
  )
}
