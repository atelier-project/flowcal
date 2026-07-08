import React from 'react';
import { GaugeChart, LineChart, BarChart } from '../../../ui/Charts';
import { DataTable } from '../../../ui/DataTable';

/**
 * DisplayNodeBody — body content for read-only display / visualization nodes
 * and simple descriptions. These depend only on the node's computed `inputs`,
 * so they carry no editing state.
 *
 * Handles: RANGE, COLLECTOR, GAUGE, PROGRESS, LINE_CHART, BAR_CHART, TABLE
 */
export const DisplayNodeBody = ({ type, inputs }) => {
    switch (type) {
        case 'RANGE':
            return <div className="text-xs text-slate-500 dark:text-slate-400">Generates array from Start to End.</div>;
        case 'COLLECTOR':
            return <div className="text-xs text-slate-500 dark:text-slate-400">Collects inputs into a single array.</div>;
        case 'GAUGE':
            return <GaugeChart value={inputs[0] || 0} min={inputs[1] || 0} max={inputs[2] || 100} />;
        case 'PROGRESS':
            return (
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-200 dark:border-slate-600">
                    <div
                        className="bg-blue-500 h-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, ((typeof inputs[0] === 'number' ? inputs[0] : 0) / (typeof inputs[1] === 'number' ? inputs[1] : 100)) * 100))}%` }}
                    />
                </div>
            );
        case 'LINE_CHART':
            return <LineChart data={inputs[0]} />;
        case 'BAR_CHART':
            return <BarChart data={inputs[0]} />;
        case 'TABLE':
            return <DataTable data={inputs[0]} />;
        default:
            return null;
    }
};

DisplayNodeBody.handlesType = (type) =>
    ['RANGE', 'COLLECTOR', 'GAUGE', 'PROGRESS', 'LINE_CHART', 'BAR_CHART', 'TABLE'].includes(type);
