// app/api/compare/route.ts
// API endpoint for document comparison

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    compareDocumentsSemanticQuick,
    compareDocumentsAIPowered,
    saveComparisonResult
} from '@/lib/documentComparator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    console.log('=== POST /api/compare called ===');

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Authenticate user
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const body = await request.json();
        const { documentIds, comparisonType = 'semantic', projectId } = body;

        // Validate input
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
            return NextResponse.json({
                error: 'At least 2 document IDs required for comparison'
            }, { status: 400 });
        }

        if (documentIds.length > 5) {
            return NextResponse.json({
                error: 'Maximum 5 documents can be compared at once'
            }, { status: 400 });
        }

        console.log(`Comparing ${documentIds.length} documents with ${comparisonType} mode`);

        // Perform comparison
        let comparison;
        if (comparisonType === 'ai_powered') {
            comparison = await compareDocumentsAIPowered(documentIds, user.id, projectId);
        } else {
            comparison = await compareDocumentsSemanticQuick(documentIds, user.id, projectId);
        }

        // Save comparison result
        const comparisonId = await saveComparisonResult(comparison, user.id, projectId);
        comparison.comparisonId = comparisonId;

        console.log(`Comparison completed: ${comparisonId}`);
        console.log(`Found ${comparison.differences.length} differences, ${comparison.similarities.length} similarities`);

        return NextResponse.json({
            success: true,
            comparison
        });

    } catch (error) {
        console.error('Comparison error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    console.log('=== GET /api/compare called ===');

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Authenticate user
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const comparisonId = searchParams.get('id');
        const projectId = searchParams.get('projectId');

        if (comparisonId) {
            // Get specific comparison
            const { data, error } = await supabase
                .from('document_comparisons')
                .select('*')
                .eq('id', comparisonId)
                .eq('user_id', user.id)
                .single();

            if (error || !data) {
                return NextResponse.json({ error: 'Comparison not found' }, { status: 404 });
            }

            return NextResponse.json({ comparison: data });
        } else if (projectId) {
            // Get all comparisons for project
            const { data, error } = await supabase
                .from('document_comparisons')
                .select('*')
                .eq('project_id', projectId)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ comparisons: data || [] });
        } else {
            // Get all comparisons for user
            const { data, error } = await supabase
                .from('document_comparisons')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ comparisons: data || [] });
        }

    } catch (error) {
        console.error('Error fetching comparisons:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
