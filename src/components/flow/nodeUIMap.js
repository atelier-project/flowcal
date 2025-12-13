import {
    Plus, Minus, X, Code, GripVertical, Activity, ListPlus,
    Gauge, Percent, TrendingUp, BarChart as BarChartIcon,
    Table as TableIcon, FileText, Flag, Box, ArrowRight, ArrowLeft,
    GitBranch, ArrowLeftRight, Divide,
    Filter, ListOrdered, Scissors, Hash, List, LayoutTemplate, MessageSquare
} from 'lucide-react';

export const NODE_UI = {
    // Data
    INPUT: { icon: GripVertical, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    RANGE: { icon: Activity, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    COLLECTOR: { icon: ListPlus, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    FORM: { icon: LayoutTemplate, color: 'purple', colorClass: 'bg-purple-100 text-purple-600' },

    // Logic
    COMPARE: { icon: ArrowLeftRight, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    IF: { icon: GitBranch, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },

    // Array
    GET: { icon: List, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    LENGTH: { icon: Hash, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    SLICE: { icon: Scissors, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    SORT: { icon: ListOrdered, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    FILTER: { icon: Filter, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },

    // Math
    SUM: { icon: Plus, color: 'blue', colorClass: 'bg-blue-100 text-blue-600' },
    SUB: { icon: Minus, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    MUL: { icon: X, color: 'purple', colorClass: 'bg-purple-100 text-purple-600' },
    DIV: { icon: Divide, color: 'red', colorClass: 'bg-red-100 text-red-600' },
    MIN: { icon: ArrowLeft, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    MAX: { icon: ArrowRight, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    ROUND: { icon: Percent, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    RANDOM: { icon: Box, color: 'fuchsia', colorClass: 'bg-fuchsia-100 text-fuchsia-600' },
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
    COMMENT: { icon: MessageSquare, color: 'amber', colorClass: 'bg-amber-100 text-amber-600' },
};

export const getUI = (type) => NODE_UI[type] || { icon: Activity, color: 'slate', colorClass: 'bg-slate-100 text-slate-600' };
