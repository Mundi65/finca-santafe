// api/youtube.js - Proxy serverless para YouTube Data API v3
const YOUTUBE_KEY = 'AIzaSyD7uUZJtYMI86IuATKkEPo2VcFrZhJ91ss';

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const q = req.query.q || '';
  if (!q) return res.status(400).json({ error: 'Missing q', items: [] });
  try {
    const searchUrl = 'https://www.googleapis.com/youtube/v3/search'
      + '?part=snippet&type=video&relevanceLanguage=es&videoDuration=medium'
      + '&maxResults=10&q=' + encodeURIComponent(q) + '&key=' + YOUTUBE_KEY;
    const sRes = await fetch(searchUrl);
    const sData = await sRes.json();
    if (!sData.items || !sData.items.length) return res.json({ items: [] });
    const ids = sData.items.map(it => it.id.videoId).join(',');
    const durUrl = 'https://www.googleapis.com/youtube/v3/videos'
      + '?part=contentDetails&id=' + ids + '&key=' + YOUTUBE_KEY;
    const dRes = await fetch(durUrl);
    const dData = await dRes.json();
    const durMap = {};
    (dData.items || []).forEach(v => { durMap[v.id] = v.contentDetails.duration || ''; });
    const items = sData.items.map(it => ({
      videoId: it.id.videoId,
      title: it.snippet.title,
      description: it.snippet.description || '',
      channelTitle: it.snippet.channelTitle,
      publishedAt: it.snippet.publishedAt,
      thumbnail: 'https://img.youtube.com/vi/' + it.id.videoId + '/mqdefault.jpg',
      duration: durMap[it.id.videoId] || ''
    }));
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    return res.json({ items });
  } catch(e) {
    return res.status(500).json({ error: e.message, items: [] });
  }
};