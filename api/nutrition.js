module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Query obrigatória' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY não configurada');
    return res.status(500).json({ error: 'API key não configurada' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em nutrição brasileiro. Responda APENAS com JSON puro, sem markdown, sem explicações.'
          },
          {
            role: 'user',
            content: `Alimento: "${query}". Retorne APENAS este JSON com os valores nutricionais totais da quantidade descrita: {"name":"descrição do alimento","cal":0,"prot":0,"carb":0,"fat":0,"fiber":0}. Substitua os zeros pelos valores reais em números. Nenhum texto adicional.`
          }
        ]
      })
    });

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      console.error('Resposta inválida OpenAI:', JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || 'Sem resposta da OpenAI' });
    }

    const text = data.choices[0].message.content.trim();
    console.log('GPT respondeu:', text);

    let foodData;
    try {
      foodData = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (e) {
      const match = text.match(/\{[\s\S]*?\}/);
      if (match) foodData = JSON.parse(match[0]);
      else return res.status(500).json({ error: 'JSON inválido na resposta' });
    }

    foodData.cal = Number(foodData.cal) || 0;
    foodData.prot = Number(foodData.prot) || 0;
    foodData.carb = Number(foodData.carb) || 0;
    foodData.fat = Number(foodData.fat) || 0;
    foodData.fiber = Number(foodData.fiber) || 0;

    return res.status(200).json(foodData);
  } catch (err) {
    console.error('Erro na função:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
