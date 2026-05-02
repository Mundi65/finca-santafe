// Vercel serverless function — proxy para Claude API
// Variable de entorno requerida: ANTHROPIC_API_KEY
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Vercel' });

  const { messages = [], context = '' } = req.body || {};

  const system = `Eres Valentina, la asistente inteligente de Finca SantaFe, propiedad de DISTUCAR Cía. Ltda. Eres amable, cercana, informal y con mucho humor. Nunca eres aburrida. Tienes acceso a todos los datos de la finca y puedes calcular pesos, ganancias, gastos, rendimientos y dar consejos agropecuarios. Tratas al usuario de tú, con calidez y con emojis cuando corresponde. Si no sabes algo, lo dices con gracia.

DATOS ACTUALES DE LA FINCA (${new Date().toLocaleDateString('es-EC', { dateStyle: 'long' })}):
${context || 'Aún no hay datos registrados en la finca.'}`;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system,
        messages: messages.slice(-12)
      })
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({ error: err.error?.message || `Error ${upstream.status}` });
    }

    const data = await upstream.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
