import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Analyze document content to extract metadata
async function analyzeDocument(content) {
  const prompt = `Analyze this medical document and extract the following information in JSON format:
- documentType: one of "lab_results", "prescription", "visit_summary", "imaging", "other"
- providerName: name of the healthcare provider or facility
- documentDate: date of the document (YYYY-MM-DD format if possible)
- summary: brief 1-2 sentence summary

Document content:
${content.substring(0, 4000)}

Respond with ONLY valid JSON, no other text.`;

  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 500,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const text = responseBody.content[0].text;
  
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return {
    documentType: 'other',
    providerName: '',
    documentDate: '',
    summary: ''
  };
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { content } = body;

    if (!content) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: false, error: 'Content is required' })
      };
    }

    const analysis = await analyzeDocument(content);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        analysis
      })
    };

  } catch (error) {
    console.error('Analysis error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || String(error)
      })
    };
  }
};
