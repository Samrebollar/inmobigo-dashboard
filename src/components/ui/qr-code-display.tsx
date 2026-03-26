'use client'

import { motion } from 'framer-motion'
import { QrCode, Download, Share2 } from 'lucide-react'

interface QRCodeDisplayProps {
    value: string
    label?: string
    size?: number
}

export function QRCodeDisplay({ value, label, size = 180 }: QRCodeDisplayProps) {
    // A clean SVG mock that looks like a real QR but is deterministic for the demonstration
    // In a production app, this would use a library like qrcode.react
    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-3xl shadow-2xl relative overflow-hidden group">
            {/* Background pattern for depth */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                className="relative z-10 p-4 bg-white rounded-xl border border-zinc-100 shadow-sm"
                style={{ width: size + 32, height: size + 32 }}
            >
                {/* SVG Mock QR Code */}
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-zinc-900"
                >
                    <rect width="100" height="100" fill="white" />
                    {/* Position markers */}
                    <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                    <rect x="4" y="4" width="22" height="22" fill="white" />
                    <rect x="8" y="8" width="14" height="14" fill="currentColor" />
                    
                    <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                    <rect x="74" y="4" width="22" height="22" fill="white" />
                    <rect x="78" y="8" width="14" height="14" fill="currentColor" />
                    
                    <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                    <rect x="4" y="74" width="22" height="22" fill="white" />
                    <rect x="8" y="78" width="14" height="14" fill="currentColor" />

                    {/* Random data squares */}
                    <rect x="40" y="0" width="8" height="8" fill="currentColor" />
                    <rect x="55" y="10" width="10" height="10" fill="currentColor" opacity="0.8" />
                    <rect x="40" y="25" width="15" height="15" fill="currentColor" opacity="0.6" />
                    <rect x="70" y="45" width="20" height="8" fill="currentColor" />
                    <rect x="35" y="55" width="12" height="12" fill="currentColor" opacity="0.9" />
                    <rect x="60" y="65" width="15" height="15" fill="currentColor" opacity="0.7" />
                    <rect x="85" y="85" width="15" height="15" fill="currentColor" opacity="0.8" />
                    <rect x="45" y="80" width="10" height="10" fill="currentColor" />
                </svg>
            </motion.div>

            {label && (
                <div className="text-center z-10">
                    <p className="text-zinc-900 font-bold text-lg leading-tight uppercase tracking-tighter transition-all group-hover:text-indigo-600 font-mono">
                        {label}
                    </p>
                    <p className="text-zinc-400 text-xs mt-1 font-medium">{value}</p>
                </div>
            )}

            <div className="flex gap-2 z-10 w-full">
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-sm font-bold transition-all active:scale-95">
                    <Download size={16} /> Descargar
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-zinc-200">
                    <Share2 size={16} /> Compartir
                </button>
            </div>
        </div>
    )
}
