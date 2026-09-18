import type { ReactElement } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface AuthorizedPageState {
    displayName: string;
    avatarUrl: string;
}

const AuthorizedPage = (): ReactElement => {
    const navigate = useNavigate();
    const location = useLocation();

    const { displayName, avatarUrl } = (location.state as AuthorizedPageState) || {};

    return (
        <main className="min-h-screen bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-800 flex items-center justify-center px-4 py-6">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl p-10 flex flex-col items-center gap-8 text-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                        <i
                            className="fa-solid fa-check text-5xl text-white"
                            aria-hidden="true"
                        ></i>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h1 className="text-white text-3xl font-bold tracking-tight">
                            You're Authorized! 🎉
                        </h1>
                        <p className="text-neutral-400 text-sm leading-relaxed">
                            You have successfully logged in with TikTok.
                            <br />
                            Welcome to your dashboard.
                        </p>
                    </div>
                </div>

                <div className="w-full h-px bg-neutral-700" />

                {/* Profile Card */}
                <div className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl p-5 flex items-center gap-4">
                    <img
                        src={avatarUrl}
                        alt={`${displayName}'s TikTok Avatar`}
                        className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-neutral-600"
                        onError={(e) => {
                            // Fallback to a generic icon if the signed avatar URL expires
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
                        }}
                    />

                    <div className="text-left overflow-hidden">
                        <p className="text-white font-semibold text-sm truncate">{displayName}</p>
                        <p className="text-neutral-500 text-xs">@{displayName?.toLowerCase()} · Connected</p>
                    </div>

                    <div className="ml-auto flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-full px-3 py-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-green-400 text-xs font-medium">Active</span>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={() => navigate('/', { replace: true, state: null })}
                    type="button"
                    className="
                        flex items-center justify-center gap-2
                        w-full max-w-xs
                        bg-red-600/10 text-red-400
                        font-medium text-sm
                        px-6 py-3
                        rounded-full
                        border border-red-600/30
                        transition-all duration-200
                        hover:bg-red-600/20 hover:border-red-500/60 hover:text-red-300
                        active:scale-95
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-700
                        cursor-pointer
                    "
                >
                    <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
                    <span>Logout</span>
                </button>
            </div>
        </main>
    );
};

export default AuthorizedPage;
