import React from 'react';

export const DataTable = ({ data }) => {
    const arr = Array.isArray(data) ? data : [data];
    return (
        <div className="w-full h-32 overflow-auto bg-white border border-slate-200 rounded text-xs">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <th className="p-1 pl-2">Index</th>
                        <th className="p-1">Value</th>
                    </tr>
                </thead>
                <tbody>
                    {arr.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50">
                            <td className="p-1 pl-2 text-slate-400 font-mono">{i}</td>
                            <td className="p-1 font-mono text-blue-600 truncate max-w-[100px]" title={typeof row === 'object' ? JSON.stringify(row) : String(row)}>
                                {typeof row === 'object' ? JSON.stringify(row) : String(row)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
