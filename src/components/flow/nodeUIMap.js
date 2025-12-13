import {
    Plus, Minus, X, Code, GripVertical, Activity, ListPlus,
    Gauge, Percent, TrendingUp, BarChart as BarChartIcon,
    Table as TableIcon, FileText, Flag, Box, ArrowRight, ArrowLeft
} from 'lucide-react';

export const NODE_UI = {
    // Data
    INPUT: { icon: GripVertical, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    RANGE: { icon: Activity, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    COLLECTOR: { icon: ListPlus, color: 'green', colorClass: 'bg-green-100 text-green-600' },

    // Math
    SUM: { icon: Plus, color: 'blue', colorClass: 'bg-blue-100 text-blue-600' },
    SUB: { icon: Minus, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    MUL: { icon: X, color: 'purple', colorClass: 'bg-purple-100 text-purple-600' },
    CUSTOM: { icon: Code, color: 'slate', colorClass: 'bg-slate-800 text-white' },

    // Visuals
    GAUGE: { icon: Gauge, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    PROGRESS: { icon: Percent, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    LINE_CHART: { icon: TrendingUp, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    BAR_CHART: { icon: BarChartIcon, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    TABLE: { icon: TableIcon, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    TEMPLATE: { icon: FileText, color: 'yellow', colorClass: 'bg-yellow-100 text-yellow-600' },
    FINAL: { icon: Flag, color: 'green', colorClass: 'bg-green-100 text-green-600' },

    // Advanced
    GROUP: { icon: Box, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    GROUP_INPUT: { icon: ArrowRight, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    GROUP_OUTPUT: { icon: ArrowLeft, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
};

export const getUI = (type) => NODE_UI[type] || { icon: Activity, color: 'slate', colorClass: 'bg-slate-100 text-slate-600' };
