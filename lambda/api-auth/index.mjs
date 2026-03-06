// Simple password authentication Lambda
export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { password } = body;

    // Get password from environment variable
    const correctPassword = process.env.APP_PASSWORD || 'changeme';

    const success = password === correctPassword;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success,
        message: success ? 'Login successful' : 'Invalid password',
      }),
    };
  } catch (error) {
    console.error('Auth Lambda error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || String(error),
      }),
    };
  }
};
