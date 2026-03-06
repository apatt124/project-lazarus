import { NextRequest, NextResponse } from 'next/server';

// Simple password check - in production, use proper authentication
const VALID_PASSWORD = process.env.APP_PASSWORD || 'lazarus2024';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    // Check password
    if (password === VALID_PASSWORD) {
      return NextResponse.json({
        success: true,
        message: 'Login successful',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
