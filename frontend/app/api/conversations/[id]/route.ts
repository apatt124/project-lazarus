// GET /api/conversations/[id] - Get conversation with messages
// PATCH /api/conversations/[id] - Update conversation (rename, pin, archive)
// DELETE /api/conversations/[id] - Delete conversation

import { NextRequest, NextResponse } from 'next/server';
import { 
  getConversationWithMessages, 
  updateConversation, 
  deleteConversation 
} from '@/lib/database';
import type { ConversationDetailResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const messageLimit = parseInt(searchParams.get('message_limit') || '50');

    const conversation = await getConversationWithMessages(conversationId, messageLimit);

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const response: ConversationDetailResponse = {
      success: true,
      conversation,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const updates = await request.json();

    // Validate updates
    const allowedFields = ['title', 'is_pinned', 'is_archived'];
    const filteredUpdates: any = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const conversation = await updateConversation(conversationId, filteredUpdates);

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;

    await deleteConversation(conversationId);

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
