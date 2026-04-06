import { NextResponse } from 'next/server';
import { logoutWhatsAppClient } from '@/lib/whatsapp';

export async function POST() {
    try {
        await logoutWhatsAppClient();
        return NextResponse.json({ success: true, message: 'Logged out successfully.' });
    } catch (error: any) {
        console.error('Error logging out:', error);
        return NextResponse.json({ error: error.message || 'Error executing logout' }, { status: 500 });
    }
}
