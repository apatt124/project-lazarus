import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({
  region: process.env.LAZARUS_AWS_REGION || 'us-east-1',
});

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No content provided' },
        { status: 400 }
      );
    }

    // Use Claude to analyze the document
    const prompt = `Analyze this medical document and extract the following information in JSON format:

Document content:
${content.substring(0, 5000)}

Please provide a JSON response with these fields:
{
  "documentType": "visit_notes" | "lab_results" | "prescription" | "imaging" | "vaccination" | "other",
  "providerName": "extracted provider name or null",
  "documentDate": "YYYY-MM-DD format or null",
  "summary": "brief 1-sentence summary"
}

Rules:
- documentType should be the most appropriate category
- providerName should be the doctor's name if mentioned (e.g., "Dr. Smith", "Dr. Jane Doe")
- documentDate should be the date of the visit/test/prescription, not today's date
- If information is not found, use null
- Return ONLY valid JSON, no other text

JSON:`;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0', // Fast and cheap for extraction
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Extract the JSON from Claude's response
    let analysisText = responseBody.content[0].text;
    
    // Try to extract JSON from the response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse analysis response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      analysis: {
        documentType: analysis.documentType || 'other',
        providerName: analysis.providerName || '',
        documentDate: analysis.documentDate || '',
        summary: analysis.summary || '',
      },
    });
  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: String(error),
        // Return empty analysis on error so upload can continue
        analysis: {
          documentType: 'other',
          providerName: '',
          documentDate: '',
          summary: '',
        }
      },
      { status: 200 } // Return 200 so frontend doesn't fail
    );
  }
}
