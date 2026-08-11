import fs from 'node:fs'
import path from 'node:path'

const siteUrl = (process.env.SITE_URL || 'https://media.kunqiongai.com').replace(/\/$/, '')
const distDir = path.resolve('dist-web')

const pages = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/video-convert', priority: '0.95', changefreq: 'daily' },
  { path: '/video-compress', priority: '0.90', changefreq: 'weekly' },
  { path: '/audio-convert', priority: '0.90', changefreq: 'weekly' },
  { path: '/video-extract-audio', priority: '0.90', changefreq: 'weekly' },
  { path: '/video-to-gif', priority: '0.85', changefreq: 'weekly' },
  { path: '/video-merge', priority: '0.85', changefreq: 'weekly' },
  { path: '/video-watermark', priority: '0.80', changefreq: 'weekly' },
]

if (!fs.existsSync(distDir)) {
  console.error('dist-web directory not found. Run the web build first.')
  process.exit(1)
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${siteUrl}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`

fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8')
fs.writeFileSync(path.join(distDir, 'robots.txt'), robots, 'utf8')

console.log(`Generated SEO files for ${siteUrl}`)
