
async function getPageImage(pageUrl) {
  try {
    const page = new URL(pageUrl);

    if (page.protocol !== 'https:') return null;

    const response = await fetch(page.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CrochetFinder/1.0)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return null;

    const finalUrl = new URL(response.url);
    if (finalUrl.protocol !== 'https:') return null;

    const html = (await response.text()).slice(0, 1500000);
    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

    for (const tag of metaTags) {
      const property = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];

      if (content && ['og:image', 'twitter:image'].includes(property)) {
        const imageUrl = new URL(
          content.replace(/&amp;/g, '&'),
          finalUrl.href
        );

        if (imageUrl.protocol === 'https:') return imageUrl.href;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getTavilyImage(item) {
  const images = Array.isArray(item.images) ? item.images : [];

  for (const image of images) {
    const imageUrl = typeof image === 'string' ? image : image?.url;

    if (!imageUrl) continue;

    try {
      const parsed = new URL(imageUrl);
      if (parsed.protocol === 'https:') return parsed.href;
    } catch {
      continue;
    }
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const query = (req.query.q || '').trim();

  if (!query) {
    return res.status(400).json({ error: 'Recherche vide.' });
  }

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Clé Tavily introuvable.' });
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: `tutoriel crochet gratuit ${query}`,
        search_depth: 'basic',
        topic: 'general',
        max_results: 10,
        include_images: true,
        include_image_descriptions: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.detail || data.message || 'Erreur Tavily.',
      });
    }

    const results = await Promise.all(
      (data.results || []).map(async (item, index) => {
        const image =
          getTavilyImage(item) ||
          await getPageImage(item.url);

        return {
          id: `${index}-${item.url}`,
          title: item.title,
          content: item.content,
          url: item.url,
          image,
          score: item.score,
        };
      })
    );

    return res.status(200).json({ results });
  } catch {
    return res.status(500).json({
      error: 'Impossible de contacter Tavily.',
    });
  }
}
