import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secure-secret-key-mediasoft-2026');

import crypto from 'crypto';

async function initializeDb() {
  // Ensure the table exists
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      api_token VARCHAR(64) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    // Try to inject api_token if the table wasn't just created but is an older version
    await query('ALTER TABLE users ADD COLUMN api_token VARCHAR(64) UNIQUE');
  } catch (e) {
    // Column likely already exists, safely ignore.
  }

  // Check if admin exists
  const users: any = await query('SELECT * FROM users WHERE email = ?', ['admin@mediasoftbd.com']);
  if (users.length === 0) {
    const hashedPassword = await bcrypt.hash('Mediasoft2026@#', 10);
    const newToken = crypto.randomBytes(16).toString('hex');
    await query('INSERT INTO users (email, password, api_token) VALUES (?, ?, ?)', ['admin@mediasoftbd.com', hashedPassword, newToken]);
  } else if (!users[0].api_token) {
    // Generate token for existing admin
    const newToken = crypto.randomBytes(16).toString('hex');
    await query('UPDATE users SET api_token = ? WHERE id = ?', [newToken, users[0].id]);
  }
}

export async function POST(req: Request) {
  try {
    await initializeDb();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const users: any = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create JWT token
    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/'
    });

    return NextResponse.json({ success: true, message: 'Login successful' });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error while logging in' }, { status: 500 });
  }
}
