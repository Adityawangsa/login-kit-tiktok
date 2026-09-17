import express, { json, urlencoded } from 'express';
import type { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parserimport crypto from 'node:crypto';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4000;

// Konfigurasi TikTok OAuth dari Environment Variables (.env)
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || '';
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || '';
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || `http://localhost:${PORT}/auth/tiktok/callback`;
const TIKTOK_SCOPES = process.env.TIKTOK_SCOPES || 'user.info.basic';

// ==========================================
// Middlewares
// ==========================================
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());

// ==========================================
// Routes (Rute harus ditaruh SEBELUM 404 Handler)
// ==========================================

// 1. Health Check
app.get('/', (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'TikTok Login Server is running',
        endpoints: {
            login: '/auth/tiktok',
            callback: '/auth/tiktok/callback'
        }
    });
});

// 2. Inisiasi Login TikTok (Redirect ke Halaman Otorisasi TikTok)
app.get('/auth/tiktok', (_req: Request, res: Response) => {
    if (!TIKTOK_CLIENT_KEY) {
        res.status(500).json({
            success: false,
            message: 'TIKTOK_CLIENT_KEY belum diisi di file .env'
        });
        return;
    }

    // Generate parameter keamanan: CSRF state & PKCE code_verifier
    const csrfState = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Simpan csrfState dan codeVerifier ke HTTP-only cookie agar aman dari akses JavaScript frontend
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 10 * 60 * 1000 // 10 menit
    };
    res.cookie('csrf_state', csrfState, cookieOptions);
    res.cookie('code_verifier', codeVerifier, cookieOptions);

    // Susun URL Otorisasi TikTok v2
    const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    authUrl.searchParams.set('client_key', TIKTOK_CLIENT_KEY);
    authUrl.searchParams.set('scope', TIKTOK_SCOPES);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', TIKTOK_REDIRECT_URI);
    authUrl.searchParams.set('state', csrfState);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Redirect browser pengguna ke halaman otorisasi TikTok
    res.redirect(authUrl.toString());
});

// 3. Callback Handler (Menerima auth code dari TikTok & menukar dengan access token)
app.get('/auth/tiktok/callback', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code, state, error, error_description } = req.query;

        // Cek jika otorisasi ditolak pengguna atau error
        if (error) {
            res.status(400).json({
                success: false,
                error: String(error),
                description: String(error_description || 'Otorisasi ditolak oleh pengguna')
            });
            return;
        }

        if (!code || typeof code !== 'string') {
            res.status(400).json({
                success: false,
                message: 'Authorization code tidak ditemukan pada query callback'
            });
            return;
        }

        // Validasi CSRF state (membandingkan state dari query dengan state di cookie)
        const savedState = req.cookies?.csrf_state;
        if (!state || state !== savedState) {
            res.status(403).json({
                success: false,
                message: 'State tidak valid (kemungkinan request tidak aman atau serangan CSRF)'
            });
            return;
        }

        // Ambil code_verifier yang tersimpan untuk verifikasi PKCE
        const codeVerifier = req.cookies?.code_verifier || '';

        // Hapus cookie keamanan setelah divalidasi
        res.clearCookie('csrf_state');
        res.clearCookie('code_verifier');

        // Tukarkan authorization code dengan Access Token via endpoint resmi TikTok
        const tokenParams = new URLSearchParams({
            client_key: TIKTOK_CLIENT_KEY,
            client_secret: TIKTOK_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: TIKTOK_REDIRECT_URI,
            code_verifier: codeVerifier
        });

        const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            body: tokenParams.toString()
        });

        const tokenData = await tokenResponse.json() as {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
            open_id?: string;
            scope?: string;
            token_type?: string;
            error?: string;
            error_description?: string;
            message?: string;
        };

        if (!tokenResponse.ok || !tokenData.access_token) {
            res.status(400).json({
                success: false,
                message: 'Gagal menukarkan authorization code dengan access token',
                details: tokenData
            });
            return;
        }

        // Ambil profil pengguna menggunakan Access Token
        const userInfoUrl = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name';
        const userResponse = await fetch(userInfoUrl, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const userData = await userResponse.json();

        // Kirim hasil login berhasil ke client
        res.json({
            success: true,
            message: 'Login TikTok berhasil!',
            auth: {
                open_id: tokenData.open_id,
                scope: tokenData.scope,
                expires_in: tokenData.expires_in
            },
            user: userData
        });
    } catch (err) {
        next(err);
    }
});

// 4. Refresh Token Handler (Untuk memperbarui token saat access_token kadaluwarsa)
app.post('/auth/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            res.status(400).json({
                success: false,
                message: 'Parameter refresh_token wajib disertakan dalam request body'
            });
            return;
        }

        const refreshParams = new URLSearchParams({
            client_key: TIKTOK_CLIENT_KEY,
            client_secret: TIKTOK_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: String(refresh_token)
        });

        const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            body: refreshParams.toString()
        });

        const data = await response.json();
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// ==========================================
// Handlers 404 & Global Error (Harus di bawah semua route)
// ==========================================

// 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Global Error Handler (4 parameter wajib: err, req, res, next)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: err.message
    });
});

// ==========================================
// Start Server
// ==========================================
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`TikTok Login Endpoint: http://localhost:${PORT}/auth/tiktok`);
rver is running on port ${ PORT } `);
});

export default app;