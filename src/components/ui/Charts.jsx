import React from 'react';

export const GaugeChart = ({ value, min = 0, max = 100 }) => {
    const safeValue = typeof value === 'number' ? value : 0;
    const safeMin = typeof min === 'number' ? min : 0;
    const safeMax = typeof max === 'number' ? max : 100;

    const p = Math.max(safeMin, Math.min(safeMax, safeValue));
    const percent = (safeMax - safeMin) === 0 ? 0 : (p - safeMin) / (safeMax - safeMin);
    const angle = 180 * percent;
    return (
        <div className="relative w-full h-24 flex flex-col items-center justify-end overflow-hidden">
            <div className="absolute top-4 w-32 h-16 rounded-t-full bg-slate-100 border-4 border-slate-200" />
            <div
                className="absolute top-4 w-32 h-16 rounded-t-full border-4 border-blue-500 border-b-0 origin-bottom transition-transform duration-500"
                style={{ transform: `rotate(${angle - 180}deg)` }}
            />
            <span className="relative z-10 text-2xl font-bold text-slate-700 -mb-1">{Math.round(safeValue)}</span>
            <div className="flex justify-between w-full px-4 text-[10px] text-slate-400 mt-2">
                <span>{safeMin}</span>
                <span>{safeMax}</span>
            </div>
        </div>
    );
};

export const LineChart = ({ data }) => {
    if (!Array.isArray(data) || data.length === 0) return <div className="text-xs text-slate-300 text-center py-8">No Data</div>;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full h-32 bg-slate-50 rounded border border-slate-100 relative p-2 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" />
            </svg>
        </div>
    );
};

export const BarChart = ({ data }) => {
    if (!Array.isArray(data) || data.length === 0) return <div className="text-xs text-slate-300 text-center py-8">No Data</div>;
    const max = Math.max(...data, 1);
    return (
        <div className="w-full h-32 bg-slate-50 rounded border border-slate-100 flex items-end gap-1 p-2">
            {data.map((d, i) => (
                <div key={i} className="flex-1 bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-all" style={{ height: `${Math.max((d / max) * 100, 5)}%` }} title={d} />
            ))}
        </div>
    );
};
