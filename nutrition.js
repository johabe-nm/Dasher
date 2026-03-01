export default async function handler(req, res) {
  // CORS — permite chamada de qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query obrigatória' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em nutrição. Responda SOMENTE com JSON válido, sem markdown, sem texto extra.'
          },
          {
            role: 'user',
            content: `Para o alimento: "${query}", retorne SOMENTE um JSON com os valores nutricionais estimados. Formato exato: {"name":"nome do alimento com quantidade","cal":numero,"prot":numero,"carb":numero,"fat":numero,"fiber":numero}. Todos os valores devem ser números. RETORNE APENAS O JSON.`
          }
        ]
      })
    });

    const data = await response.json();
    if (!data.choices || !data.choices[0]) throw new Error(data.error?.message || 'Sem resposta da OpenAI');

    const text = data.choices[0].message.content.trim();
    let foodData;
    try {
      foodData = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
      const match = text.match(/\{[\s\S]*?\}/);
      if (match) foodData = JSON.parse(match[0]);
      else throw new Error('Falha ao interpretar resposta');
    }

    return res.status(200).json(foodData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
