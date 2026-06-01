import { NextResponse } from 'next/server'

const BASE = 'https://social.conectaai.cl'

export async function GET() {
  const urls = [
    { loc: BASE, priority: '1.0', changefreq: 'weekly' },
    { loc: BASE + '/auth/login', priority: '0.5', changefreq: 'monthly' },
  ]
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(u =>
      '  <url>\n    <loc>' + u.loc + '</loc>\n    <changefreq>' + u.changefreq + '</changefreq>\n    <priority>' + u.priority + '</priority>\n  </url>'
    ),
    '</urlset>',
  ].join('\n')
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  })
}
