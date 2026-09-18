import { useEffect, useMemo, type ReactElement } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const backendUrl = 'http://localhost:4000';

type TiktokResult =
    | {
        status: 'success';
        tiktokOpenId: string;
        displayName: string;
        avatarUrl: string;
    } | {
        status: 'error';
        message: string;
    } | {
        status: 'idle';
    };

function parseTiktokParams(searchParams: URLSearchParams): TiktokResult {
    const exchange = searchParams.get('exchange');

    if (exchange) {
        const params = new URLSearchParams(exchange);
        const tiktokOpenId = params.get('tiktok_open_id');
        const displayName = params.get('display_name');
        const avatarUrl = params.get('avatar_url');

        if (tiktokOpenId && displayName && avatarUrl) {
            return {
                status: 'success',
                tiktokOpenId: tiktokOpenId,
                displayName: displayName,
                avatarUrl: avatarUrl
            };
        }

        return { status: 'error', message: 'Missing Tiktok parameter' };
    }

    if (searchParams.get('tiktok_error')) {
        return { status: 'error' };
    }

    return { status: 'idle' }
}

const LoginPage = (): ReactElement => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const exchangeResult = useMemo<TiktokResult>(
        () => parseTiktokParams(searchParams),
        [searchParams]
    );

    const errorMessage = exchangeResult.status === 'error' ? 'Tiktok sign-in failed. Please try agian!' : ''

    const loginWithTiktok = (): void => {
        try {
            const window = document.defaultView;

            if (!window) return;

            window.location.assign(`${backendUrl}/auth/tiktok/web`);
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        if (exchangeResult.status !== 'success') return;

        navigate('/authorized', {
            state: {
                displayName: exchangeResult.displayName,
                avatarUrl: exchangeResult.avatarUrl
            },
            replace: true
        });
    }, [exchangeResult, navigate]);

    return (
        <main className="min-h-screen bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-800 flex items-center justify-center px-4 py-6">
            <section className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl shadow-xl overflow-hidden p-10 flex flex-col items-center gap-8">
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center"
                        onClick={() => navigate('/')}>
                        {/* TODO: Add Tiktok Logo here */}
                        <i className="fa-brands fa-tiktok text-4xl text-white"
                            aria-hidden="true"></i>
                    </div>

                    <h1 className="text-white text-3xl font-bold tracking-tight">Tiktok</h1>
                    <p className="text-white/80 text-center">
                        Sign in to your account to discover, create, and share short videos with the world
                    </p>
                </div>

                {/* Error Badge */}
                {errorMessage && (
                    <div role="alert"
                        className="w-full py-2.5 px-5 flex items-center gap-2 bg-red-950/40 border border-red-800/60 text-red-400 rounded-md">
                        <i className="fa-solid fa-circle-exclamation text-base shrink-0" aria-hidden="true"></i>
                        <span className="text-sm font-medium">{errorMessage}</span>
                    </div>

                )}

                <div className="w-full flex items-center gap-4">
                    <div className="flex-1 h-px bg-neutral-700"></div>
                    <div className="text-neutral-500 text-xs uppercase tracking-widest">Continue with</div>
                    <div className="flex-1 h-px bg-neutral-700"></div>
                </div>

                <button
                    type="button"
                    onClick={loginWithTiktok}
                    className="cursor-pointer w-full flex items-center justify-center gap-2 bg-neutral-800 border border-neutral-700 text-white rounded-md py-2">
                    <i className="fa-brands fa-tiktok w-5 h-5" aria-hidden="true"></i>
                    <span>Login with TikTok</span>
                </button>

                {/* Footer Note */}
                <p className="text-xs text-neutral-500 text-center">
                    By logging in, you agree to our
                    <a href="#" className="text-white"> Terms of Use</a> and
                    <a href="#" className="text-white"> Privacy Policy</a>
                </p>
            </section>
        </main>
    )
}

export default LoginPage;