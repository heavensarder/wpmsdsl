import { NextResponse } from 'next/server';
import { query, initMessageLogsTable } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secure-secret-key-mediasoft-2026');

export async function GET(req: Request) {
    try {
        // Auth check
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        await jwtVerify(token, JWT_SECRET);

        await initMessageLogsTable();

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '15')));
        const status = searchParams.get('status') || 'all'; // all, success, failed
        const monthFilter = searchParams.get('month') || 'all'; // all, 'YYYY-MM', 'today', 'yesterday', 'custom'
        const startDate = searchParams.get('startDate') || '';
        const endDate = searchParams.get('endDate') || '';
        const search = searchParams.get('search') || '';
        const offset = (page - 1) * limit;

        // Build query conditions
        const conditions: string[] = [];
        const params: any[] = [];

        if (status !== 'all') {
            conditions.push('status = ?');
            params.push(status);
        }

        if (monthFilter === 'today') {
            conditions.push("DATE(created_at) = CURDATE()");
        } else if (monthFilter === 'yesterday') {
            conditions.push("DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)");
        } else if (monthFilter === 'custom') {
            if (startDate && endDate) {
                conditions.push("DATE(created_at) BETWEEN ? AND ?");
                params.push(startDate, endDate);
            } else if (startDate) {
                conditions.push("DATE(created_at) >= ?");
                params.push(startDate);
            } else if (endDate) {
                conditions.push("DATE(created_at) <= ?");
                params.push(endDate);
            }
        } else if (monthFilter !== 'all') {
            // Check if monthFilter matches YYYY-MM
            if (/^\d{4}-\d{2}$/.test(monthFilter)) {
                conditions.push("DATE_FORMAT(created_at, '%Y-%m') = ?");
                params.push(monthFilter);
            }
        }

        if (search.trim()) {
            conditions.push('phone_number LIKE ?');
            params.push(`%${search.trim()}%`);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Get total count
        const countResult: any = await query(
            `SELECT COUNT(*) as total FROM message_logs ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get paginated results
        const logs: any = await query(
            `SELECT id, phone_number, message, file_url, status, error_reason, wa_message_id, created_at 
             FROM message_logs ${whereClause} 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, String(limit), String(offset)]
        );

        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error: any) {
        console.error('History API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
