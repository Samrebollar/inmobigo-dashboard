'use client'

export function AnimatedBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden bg-black">
            {/* Deep Space Base */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-black to-black opacity-80" />

            {/* Aurora Effect 1 - Blue/Violet */}
            <div className="absolute -top-[20%] -left-[10%] h-[800px] w-[800px] rounded-full bg-indigo-500/20 blur-[120px] animate-aurora-1" />

            {/* Aurora Effect 2 - Cyan/Teal */}
            <div className="absolute top-[10%] right-[10%] h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[100px] animate-aurora-2" />

            {/* Aurora Effect 3 - Violet Bottom */}
            <div className="absolute -bottom-[20%] left-[20%] h-[900px] w-[900px] rounded-full bg-violet-600/10 blur-[140px] animate-aurora-3" />

            {/* Grain Overlay for Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none"></div>
        </div>
    )
}
