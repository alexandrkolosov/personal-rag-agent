// app/api/cache/route.ts
// API endpoint for managing search cache

import { NextRequest, NextResponse } from 'next/server';
import { searchCache } from '@/lib/searchCache';
import { semanticCache } from '@/lib/semanticCache';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cache stats from both caches
    const exactMatchStats = searchCache.stats();
    const semanticStats = semanticCache.stats();

    return NextResponse.json({
      exactMatchCache: exactMatchStats,
      semanticCache: semanticStats,
      totalCacheEntries: exactMatchStats.size + semanticStats.size,
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear both caches
    searchCache.clear();
    semanticCache.clear();

    return NextResponse.json({
      success: true,
      message: 'Both exact match and semantic caches cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
