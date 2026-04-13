import { NextResponse } from 'next/server';
import { getWhatsAppStatus, initWhatsAppClient } from '@/lib/whatsapp';
import { getGatewaySettings } from '@/lib/db';

export async function GET() {
    const settings = await getGatewaySettings();

    if (settings.active_engine === 'meta') {
        if (settings.meta_access_token && settings.meta_phone_id) {
            return NextResponse.json({ status: 'CONNECTED_READY', qrCodeUrl: null, active_engine: 'meta' });
        } else {
            return NextResponse.json({ status: 'DISCONNECTED', qrCodeUrl: null, active_engine: 'meta' });
        }
    }

    // Attempt to initialize if not already done for wwebjs.
    initWhatsAppClient();

    const statusObj = getWhatsAppStatus();

    return NextResponse.json({ ...statusObj, active_engine: 'wwebjs' });
}
