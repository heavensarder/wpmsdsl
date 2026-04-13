import { NextResponse } from 'next/server';
import { query, getGatewaySettings } from '@/lib/db';

export async function GET() {
    try {
        const settings = await getGatewaySettings();
        return NextResponse.json({ success: true, settings });
    } catch (error: any) {
        console.error('Failed to get settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { active_engine, meta_access_token, meta_phone_id } = body;

        await getGatewaySettings(); // ensures table exists

        const updates: any[] = [];
        const values: any[] = [];

        if (active_engine !== undefined) {
            updates.push('active_engine = ?');
            values.push(active_engine);
        }
        if (meta_access_token !== undefined) {
            updates.push('meta_access_token = ?');
            values.push(meta_access_token);
        }
        if (meta_phone_id !== undefined) {
            updates.push('meta_phone_id = ?');
            values.push(meta_phone_id);
        }

        if (updates.length > 0) {
            values.push(1); // WHERE id = 1
            await query(`UPDATE gateway_settings SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        return NextResponse.json({ success: true, message: 'Settings updated successfully' });
    } catch (error: any) {
        console.error('Failed to update settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
