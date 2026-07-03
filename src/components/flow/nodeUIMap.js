import {
    Calculator, Calendar, Type, List, CheckSquare,
    ArrowRight, ArrowLeft, Layout, Box,
    BarChart3, LineChart, Table, MousePointer2,
    Play, Settings, Code, FileText, Database,
    Plus, Minus, X, Divide, Percent, Hash,
    Maximize, Minimize, ArrowDownUp,
    Gauge, Activity, AlignLeft, AlignCenter,
    HelpCircle, MoreHorizontal,
    ListPlus, ListMinus, Radio,
    GripVertical, LayoutTemplate, ArrowLeftRight, GitBranch,
    ListOrdered, Scissors, Filter, TrendingUp,
    MessageSquare, Braces, PackageOpen, Package, Flag,
    Repeat, IterationCw, Target, CheckCircle, Sigma, ListChecks, CircleDot
} from 'lucide-react';

export const NODE_UI = {
    // Data
    INPUT: { icon: GripVertical, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    SELECT: { icon: CircleDot, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    RANGE: { icon: Activity, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    COLLECTOR: { icon: ListPlus, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    FORM: { icon: LayoutTemplate, color: 'purple', colorClass: 'bg-purple-100 text-purple-600' },
    GET_GLOBAL: { icon: Database, color: 'purple', colorClass: 'bg-purple-100 text-purple-600' },

    // Logic
    COMPARE: { icon: ArrowLeftRight, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    IF: { icon: GitBranch, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    LOOKUP: { icon: ListChecks, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },

    // Array
    GET: { icon: List, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    LENGTH: { icon: Hash, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    SLICE: { icon: Scissors, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    SORT: { icon: ListOrdered, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },

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
    BAR_CHART: { icon: BarChart3, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    TABLE: { icon: Table, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    TEMPLATE: { icon: FileText, color: 'yellow', colorClass: 'bg-yellow-100 text-yellow-600' },
    FINAL: { icon: Flag, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    REPORT: { icon: FileText, color: 'green', colorClass: 'bg-green-100 text-green-600' },

    // Advanced
    GROUP: { icon: Box, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    GROUP_INPUT: { icon: ArrowRight, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    GROUP_INPUT_LIST: { icon: ListPlus, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    GROUP_OUTPUT: { icon: ArrowLeft, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    GROUP_OUTPUT_LIST: { icon: ListMinus, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    WARP_IN: { icon: Radio, color: 'purple', colorClass: 'bg-purple-100 text-purple-600' },
    WARP_OUT: { icon: Radio, color: 'purple', colorClass: 'bg-purple-100 text-purple-600' },
    COMMENT: { icon: MessageSquare, color: 'amber', colorClass: 'bg-amber-100 text-amber-600' },
    TEXT_LABEL: { icon: AlignCenter, color: 'slate', colorClass: 'bg-slate-100 text-slate-600' },
    FUNCTION: { icon: Braces, color: 'emerald', colorClass: 'bg-emerald-100 text-emerald-600' },
    FRAME: { icon: Box, color: 'sky', colorClass: 'bg-sky-100 text-sky-600' },
    UNPACK: { icon: PackageOpen, color: 'violet', colorClass: 'bg-violet-100 text-violet-600' },
    PACK: { icon: Package, color: 'violet', colorClass: 'bg-violet-100 text-violet-600' },

    // Iterator
    MAP: { icon: Repeat, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    FILTER: { icon: Filter, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    REDUCE: { icon: Sigma, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    MAP_ITEM: { icon: Box, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    MAP_INDEX: { icon: Hash, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    MAP_OUTPUT: { icon: Target, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    FILTER_ITEM: { icon: Box, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    FILTER_INDEX: { icon: Hash, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    FILTER_INCLUDE: { icon: CheckCircle, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    REDUCE_ITEM: { icon: Box, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    REDUCE_INDEX: { icon: Hash, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    REDUCE_ACCUMULATOR: { icon: Sigma, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    REDUCE_OUTPUT: { icon: Target, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },

    // Atelier topology nodes
    ATELIER_INGRESS: { icon: ArrowLeftRight, color: 'violet', colorClass: 'bg-violet-100 text-violet-600' },
    ATELIER_SERVICE: { icon: Database, color: 'violet', colorClass: 'bg-violet-100 text-violet-600' },
    ATELIER_DEPLOYMENT: { icon: Box, color: 'violet', colorClass: 'bg-violet-100 text-violet-600' },
};

export const getUI = (type) => NODE_UI[type] || { icon: Activity, color: 'slate', colorClass: 'bg-slate-100 text-slate-600' };
