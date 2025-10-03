// app/api/cache/clear/route.ts
// API endpoint to clear all caches for testing

import { NextRequest, NextResponse } from 'next/server';
import { searchCache } from '../../../../lib/searchCache';
import { semanticCache } from '../../../../lib/semanticCache';

export async function POST(request: NextRequest) {
  try {
    // Clear both caches
    searchCache.clear();
    semanticCache.clear();

    return NextResponse.json({
      success: true,
      message: 'All caches cleared successfully'
    });
  } catch (error: any) {
    console.error('Cache clear error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return cache stats
    const searchStats = searchCache.stats();
    const semanticStats = semanticCache.stats();

    return NextResponse.json({
      searchCache: searchStats,
      semanticCache: semanticStats
    });
  } catch (error: any) {
    console.error('Cache stats error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
