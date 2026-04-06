import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secure-secret-key-mediasoft-2026');

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.userId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const users: any = await query('SELECT email, api_token FROM users WHERE id = ?', [payload.userId]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
        email: users[0].email, 
        instance_id: users[0].api_token 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }
}
