import React, { useEffect, useState } from 'react';

const Snowflake = ({ style }) => (
    <div
        className="absolute pointer-events-none text-white opacity-80"
        style={{
            ...style,
            animation: `snowfall ${style.duration}s linear infinite`,
            textShadow: '0 0 5px rgba(255, 255, 255, 0.5)',
        }}
    >
        ❄
    </div>
);

export const Snowfall = ({ enabled = true }) => {
    const [snowflakes, setSnowflakes] = useState([]);

    useEffect(() => {
        if (!enabled) {
            setSnowflakes([]);
            return;
        }

        const flakes = [];
        const numFlakes = 50;

        for (let i = 0; i < numFlakes; i++) {
            flakes.push({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 10,
                duration: 8 + Math.random() * 12,
                size: 10 + Math.random() * 16,
                opacity: 0.4 + Math.random() * 0.6,
            });
        }

        setSnowflakes(flakes);
    }, [enabled]);

    if (!enabled || snowflakes.length === 0) return null;

    return (
        <>
            <style>{`
                @keyframes snowfall {
                    0% {
                        transform: translateY(-100px) rotate(0deg);
                    }
                    100% {
                        transform: translateY(100vh) rotate(360deg);
                    }
                }
            `}</style>
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
                {snowflakes.map((flake) => (
                    <Snowflake
                        key={flake.id}
                        style={{
                            left: `${flake.left}%`,
                            top: '-20px',
                            fontSize: `${flake.size}px`,
                            animationDelay: `${flake.delay}s`,
                            duration: flake.duration,
                            opacity: flake.opacity,
                        }}
                    />
                ))}
            </div>
        </>
    );
};
