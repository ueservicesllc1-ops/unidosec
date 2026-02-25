import { useEffect, useState, useRef } from 'react';
import {
    incrementVisitCount,
    subscribeToVisitCount,
} from '../services/visitCounterService';

function formatNumber(n: number): string {
    return n.toLocaleString('es-EC');
}

export default function VisitCounter() {
    const [count, setCount] = useState<number | null>(null);
    const [displayCount, setDisplayCount] = useState(0);
    const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Register visit once per session
    useEffect(() => {
        incrementVisitCount();
    }, []);

    // Subscribe to real-time Firestore updates
    useEffect(() => {
        const unsubscribe = subscribeToVisitCount((total) => {
            setCount(total);
        });
        return () => unsubscribe();
    }, []);

    // Animate number roll-up when count changes
    useEffect(() => {
        if (count === null) return;
        if (animRef.current) clearTimeout(animRef.current);

        const start = displayCount;
        const end = count;
        const duration = 1200;
        const steps = 40;
        const stepTime = duration / steps;
        let current = start;
        const increment = (end - start) / steps;

        function tick() {
            current += increment;
            if (
                (increment > 0 && current >= end) ||
                (increment < 0 && current <= end) ||
                increment === 0
            ) {
                setDisplayCount(end);
                return;
            }
            setDisplayCount(Math.round(current));
            animRef.current = setTimeout(tick, stepTime);
        }

        tick();

        return () => {
            if (animRef.current) clearTimeout(animRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count]);

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '999px',
                padding: '6px 16px',
                fontSize: '0.82rem',
                color: '#cbd5e1',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.3s ease',
            }}
            title="Visitas totales al sitio"
        >
            {/* Eye icon */}
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: '#38bdf8', flexShrink: 0 }}
            >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
            </svg>

            {count === null ? (
                <span style={{ opacity: 0.5 }}>Cargando…</span>
            ) : (
                <>
                    <span style={{ color: '#38bdf8', fontWeight: 700, letterSpacing: '0.03em' }}>
                        {formatNumber(displayCount)}
                    </span>
                    <span>visitas totales</span>
                </>
            )}
        </div>
    );
}
