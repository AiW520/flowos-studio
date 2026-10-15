import type { MetadataRoute } from 'next'

const routes = ['/home', '/create', '/projects', '/assets', '/discover', '/models', '/workflows', '/creator', '/templates', '/tools', '/community']

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://flow.47.107.92.13.nip.io'
  return routes.map((route) => ({ url: `${baseUrl}${route}`, lastModified: new Date(), changeFrequency: 'weekly', priority: route === '/home' ? 1 : 0.7 }))
}
