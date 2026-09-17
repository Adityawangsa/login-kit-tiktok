import { Request, Response } from 'express';
import { randomBytes } from 'crypto';

const WEB_APP_URL = 'http://localhost:3000';
const REDIRECT_URL = 'https://figment-saturday-annuity.ngrok-free.dev/auth/tiktok/web/callback';

export const tikTokWebAuthorization = async (req: Request, res: Response): Promise<void> => {
    try {
        const state = randomBytes(24).toString('hex');

        res.cookie('tiktok_oauth_state', state, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000
        });

        const params = new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT!,
            scope: 'user.info.basic',
            response_type: 'code',
            redirect_uri: REDIRECT_URL,
            state: state
        });

        const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
        console.log('Constructed Authorization URL:', url);

        res.redirect(url);

    } catch (error) {
        return res.redirect(`${WEB_APP_URL}?tiktok_error=unknown`);
    }
}