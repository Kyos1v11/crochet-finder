
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const query = (req.query.q || '').trim();

  if (!query) {
    return res.status(400).json({ error: 'Recherche vide.' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Clé YouTube introuvable.' });
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');

    url.search = new URLSearchParams({
      part: 'snippet',
      q: `crochet ${query} tutoriel gratuit`,
      type: 'video',
      maxResults: '12',
      order: 'relevance',
      relevanceLanguage: 'fr',
      key: apiKey,
    });

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Erreur YouTube.',
      });
    }

    const videos = (data.items || []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail:
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return res.status(200).json({ videos });
  } catch {
    return res.status(500).json({
      error: 'Impossible de contacter YouTube.',
    });
  }
}
