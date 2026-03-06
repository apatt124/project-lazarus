// GET /api/conversations - List all conversations
// POST /api/conversations - Create a new conversation

import { NextRequest, NextResponse } from 'next/server';
import { listConversations, createConversation } from '@/lib/database';
import type { ConversationListResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('user_id') || undefined;

    const { conversations, total } = await listConversations(userId, limit, offset);

    const response: ConversationListResponse = {
      success: true,
      conversations,
      total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('List conversations error:', error);
    return NextResponse.json(
      { 
        success: false, 
        conversations: [],
        total: 0,
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, user_id } = await request.json();

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const conversation = await createConversation(title, user_id);

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
