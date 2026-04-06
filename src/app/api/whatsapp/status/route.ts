import { NextResponse } from 'next/server';
import { getWhatsAppStatus, initWhatsAppClient } from '@/lib/whatsapp';

export async function GET() {
    // Attempt to initialize if not already done.
    initWhatsAppClient();

    const statusObj = getWhatsAppStatus();

    return NextResponse.json(statusObj);
}
