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

        res.redirect(url);
    } catch (error) {
        return res.redirect(`${WEB_APP_URL}?tiktok_error=unknown`);
    }
}

export const tiktokRedirect = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            const err: any = error;
            return res.redirect(`${WEB_APP_URL}?tiktok_error=${encodeURIComponent(err)}`);
        }

        if (!code) {
            return res.redirect(`${WEB_APP_URL}?tiktok_error=missing_code`);
        }

        if (!state) {
            return res.redirect(`${WEB_APP_URL}?tiktok_error=invalid_state`);
        }

        res.clearCookie('tiktok_oauth_state');

        // Exchange authorization code
        const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT!,
                client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                code: `${code}`,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URL
            })
        });

        const tokenData: any = await tokenResponse.json();

        if (!tokenResponse.ok || tokenData.error) {
            return res.redirect(`${WEB_APP_URL}?tiktok_error=token_exchange`);
        }

        // Retrive TikTok Profile
        const profileResponse = await fetch(
            'https://open.tiktokapis.com/v2/info' +
            '?fields=open_id,display_name,avatar_url',
            {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`
                }
            }
        );

        const profileData: any = await profileResponse.json();

        if (!profileResponse.ok || profileData.error?.code !== 'ok') {
            return res.redirect(`${WEB_APP_URL}?tiktok_error=profile`);
        }

        const profile = profileData.data?.user;

        const callbackParams = new URLSearchParams();

        callbackParams.set('tiktok_open_id', profile.open_id);
        callbackParams.set('display_name', profile.display_name ?? null);
        callbackParams.set('avatar_url', profile.avatar_url ?? null);

        return res.redirect(
            `${WEB_APP_URL}?exchange=${encodeURIComponent(callbackParams.toString())}`
        );
    } catch (error) {
        return res.redirect(`${WEB_APP_URL}?tiktok_error=unknown`);
    }
}