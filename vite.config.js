
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

async function getPageImage(pageUrl) {
  try {
    const page = new URL(pageUrl)

    if (page.protocol !== 'https:') return null

    const response = await fetch(page.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CrochetFinder/1.0)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(6000),
    })

    if (!response.ok) return null

    const finalUrl = new URL(response.url)

    if (finalUrl.protocol !== 'https:') return null

    const html = (await response.text()).slice(0, 1500000)
    const metaTags = html.match(/<meta\b[^>]*>/gi) || []

    for (const tag of metaTags) {
      const property = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
      const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1]

      if (
        content &&
        ['og:image', 'twitter:image'].includes(property)
      ) {
        const imageUrl = new URL(
          content.replace(/&amp;/g, '&'),
          finalUrl.href
        )

        if (imageUrl.protocol === 'https:') {
          return imageUrl.href
        }
      }
    }

    return null
  } catch {
    return null
  }
}

function getTavilyImage(item) {
  const images = Array.isArray(item.images) ? item.images : []

  for (const image of images) {
    const imageUrl = typeof image === 'string' ? image : image?.url

    if (!imageUrl) continue

    try {
      const parsed = new URL(imageUrl)

      if (parsed.protocol === 'https:') {
        return parsed.href
      }
    } catch {
      continue
    }
  }

  return null
}

function youtubeSearch(apiKey) {
  return {
    name: 'youtube-search',

    configureServer(server) {
      server.middlewares.use('/api/search', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')

        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Méthode non autorisée.' }))
          return
        }

        const params = new URL(req.url || '/', 'http://localhost').searchParams
        const query = (params.get('q') || '').trim()

        if (!query) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Recherche vide.' }))
          return
        }

        if (!apiKey) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Clé YouTube introuvable.' }))
          return
        }

        try {
          const url = new URL('https://www.googleapis.com/youtube/v3/search')

          url.search = new URLSearchParams({
            part: 'snippet',
            q: `crochet ${query} tutoriel`,
            type: 'video',
            maxResults: '12',
            order: 'relevance',
            relevanceLanguage: 'fr',
            key: apiKey,
          })

          const response = await fetch(url)
          const data = await response.json()

          if (!response.ok) {
            res.statusCode = response.status
            res.end(JSON.stringify({
              error: data.error?.message || 'Erreur YouTube.',
            }))
            return
          }

          const videos = (data.items || []).map((item) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail:
              item.snippet.thumbnails.medium?.url ||
              item.snippet.thumbnails.default?.url,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          }))

          res.statusCode = 200
          res.end(JSON.stringify({ videos }))
        } catch {
          res.statusCode = 500
          res.end(JSON.stringify({
            error: 'Impossible de contacter YouTube.',
          }))
        }
      })
    },
  }
}

function webSearch(apiKey) {
  return {
    name: 'tavily-search',

    configureServer(server) {
      server.middlewares.use('/api/web-search', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')

        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Méthode non autorisée.' }))
          return
        }

        const params = new URL(req.url || '/', 'http://localhost').searchParams
        const query = (params.get('q') || '').trim()

        if (!query) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Recherche vide.' }))
          return
        }

        if (!apiKey) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Clé Tavily introuvable.' }))
          return
        }

        try {
          const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: apiKey,
              query: `tutoriel crochet ${query}`,
              search_depth: 'basic',
              topic: 'general',
              max_results: 10,
              include_images: true,
              include_image_descriptions: true,
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            res.statusCode = response.status
            res.end(JSON.stringify({
              error: data.detail || data.message || 'Erreur Tavily.',
            }))
            return
          }

          const results = await Promise.all(
            (data.results || []).map(async (item, index) => {
              const image =
                getTavilyImage(item) ||
                await getPageImage(item.url)

              return {
                id: `${index}-${item.url}`,
                title: item.title,
                content: item.content,
                url: item.url,
                image,
                score: item.score,
              }
            })
          )

          res.statusCode = 200
          res.end(JSON.stringify({ results }))
        } catch {
          res.statusCode = 500
          res.end(JSON.stringify({
            error: 'Impossible de contacter Tavily.',
          }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      youtubeSearch(env.YOUTUBE_API_KEY),
      webSearch(env.TAVILY_API_KEY),
    ],
  }
})
