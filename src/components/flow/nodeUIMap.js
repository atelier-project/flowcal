import {
    Calculator, Calendar, Type, List, CheckSquare,
    ArrowRight, ArrowLeft, Layout, Box,
    BarChart3, LineChart, Table, MousePointer2,
    Play, Settings, Code, FileText, Database,
    Plus, Minus, X, Divide, Percent, Hash,
    Maximize, Minimize, ArrowDownUp,
    Gauge, Activity, AlignLeft,
    HelpCircle, MoreHorizontal,
    ListPlus, Radio,
    GripVertical, LayoutTemplate, ArrowLeftRight, GitBranch,
    ListOrdered, Scissors, Filter, TrendingUp,
    MessageSquare, Braces, PackageOpen, Package, Flag,
    Link, Replace, Ruler, Clock, Key, BoxSelect, ArrowDown
} from 'lucide-react';
import { TYPES } from '../../utils/typeUtils';

export const TYPE_COLORS = {
    [TYPES.NUMBER]: '#3b82f6', // blue-500
    [TYPES.STRING]: '#22c55e', // green-500
    [TYPES.BOOLEAN]: '#ef4444', // red-500
    [TYPES.ARRAY]: '#a855f7', // purple-500
    [TYPES.OBJECT]: '#eab308', // yellow-500
    [TYPES.ANY]: '#94a3b8', // slate-400
    [TYPES.DATE]: '#f97316' // orange-500
};

export const NODE_UI = {
    // Data
    INPUT: { icon: GripVertical, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    TEXT_INPUT: { icon: Type, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    DATE_INPUT: { icon: Calendar, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    RANGE: { icon: Activity, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    CSV_DATA: { icon: FileText, color: 'slate', colorClass: 'bg-slate-100 text-slate-600' },
    COLLECTOR: { icon: ListPlus, color: 'green', colorClass: 'bg-green-100 text-green-600' },
    FORM: { icon: LayoutTemplate, color: 'purple', colorClass: 'bg-purple-100 text-purple-600' },

    // Logic
    COMPARE: { icon: ArrowLeftRight, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    IF: { icon: GitBranch, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    GREATER_THAN: { icon: ArrowRight, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    LESS_THAN: { icon: ArrowLeft, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },

    // Array
    GET_KEY: { icon: List, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    LENGTH: { icon: Hash, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    SLICE: { icon: Scissors, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    SORT: { icon: ListOrdered, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    FILTER: { icon: Filter, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    MAP: { icon: List, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },

    // Math
    SUM: { icon: Plus, color: 'blue', colorClass: 'bg-blue-100 text-blue-600' },
    SUBTRACT: { icon: Minus, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    MULTIPLY: { icon: X, color: 'purple', colorClass: 'bg-purple-100 text-purple-600' },
    DIVIDE: { icon: Divide, color: 'red', colorClass: 'bg-red-100 text-red-600' },
    MIN: { icon: ArrowLeft, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    MAX: { icon: ArrowRight, color: 'cyan', colorClass: 'bg-cyan-100 text-cyan-600' },
    ROUND: { icon: Percent, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    FLOOR: { icon: ArrowDownUp, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    CEIL: { icon: ArrowDownUp, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    RANDOM: { icon: Box, color: 'fuchsia', colorClass: 'bg-fuchsia-100 text-fuchsia-600' },

    // Advanced
    CUSTOM: { icon: Code, color: 'slate', colorClass: 'bg-slate-800 text-white' },
    GROUP: { icon: Package, color: 'slate', colorClass: 'bg-slate-100 text-slate-600' },
    GROUP_INPUT: { icon: GripVertical, color: 'slate', colorClass: 'bg-slate-100 text-slate-600' },
    GROUP_INPUT_LIST: { icon: GripVertical, color: 'slate', colorClass: 'bg-slate-100 text-slate-600' },
    GROUP_OUTPUT: { icon: ArrowRight, color: 'slate', colorClass: 'bg-slate-100 text-slate-600' },
    WARP_IN: { icon: Radio, color: 'purple', colorClass: 'bg-purple-100 text-purple-600' },
    WARP_OUT: { icon: Radio, color: 'purple', colorClass: 'bg-purple-100 text-purple-600' },
    COMMENT: { icon: MessageSquare, color: 'yellow', colorClass: 'bg-yellow-100 text-yellow-600' },
    FRAME: { icon: Layout, color: 'blue', colorClass: 'bg-blue-100 text-blue-600' },
    FUNCTION: { icon: Braces, color: 'slate', colorClass: 'bg-slate-800 text-white' },

    // Visuals
    GAUGE: { icon: Gauge, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    PROGRESS: { icon: Percent, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    LINE_CHART: { icon: TrendingUp, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    BAR_CHART: { icon: BarChart3, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    TABLE: { icon: Table, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    SINGLE_VALUE: { icon: Hash, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    TEXT_DISPLAY: { icon: Type, color: 'teal', colorClass: 'bg-teal-100 text-teal-600' },
    FINAL: { icon: Flag, color: 'red', colorClass: 'bg-red-50 text-red-600' },

    // String
    STRING_CONCAT: { icon: Link, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    STRING_SPLIT: { icon: Scissors, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    STRING_REPLACE: { icon: Replace, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    STRING_UPPER: { icon: Type, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    STRING_LOWER: { icon: Type, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    STRING_LENGTH: { icon: Ruler, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    STRING_TRIM: { icon: Scissors, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },
    STRING_SUBSTRING: { icon: Scissors, color: 'pink', colorClass: 'bg-pink-100 text-pink-600' },

    // Date
    DATE_NOW: { icon: Clock, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    DATE_FORMAT: { icon: Calendar, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    DATE_PARSE: { icon: Calendar, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },
    DATE_DIFF: { icon: Clock, color: 'orange', colorClass: 'bg-orange-100 text-orange-600' },

    // Array (Additional)
    GET: { icon: MousePointer2, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },
    ARRAY_FLATTEN: { icon: ArrowDown, color: 'indigo', colorClass: 'bg-indigo-100 text-indigo-600' },

    // Object
    OBJECT_COMBINE: { icon: Package, color: 'yellow', colorClass: 'bg-yellow-100 text-yellow-600' },
    OBJECT_FLATTEN: { icon: ArrowDown, color: 'yellow', colorClass: 'bg-yellow-100 text-yellow-600' },
    OBJECT_KEYS: { icon: Key, color: 'yellow', colorClass: 'bg-yellow-100 text-yellow-600' },
    OBJECT_VALUES: { icon: List, color: 'yellow', colorClass: 'bg-yellow-100 text-yellow-600' },
    UNPACK: { icon: BoxSelect, color: 'yellow', colorClass: 'bg-yellow-100 text-yellow-600' },
    PACK: { icon: Package, color: 'yellow', colorClass: 'bg-yellow-100 text-yellow-600' }
};

export const getIcon = (type) => NODE_UI[type]?.icon || HelpCircle;
export const getColor = (type) => NODE_UI[type]?.color || 'gray';
export const getColorClass = (type) => NODE_UI[type]?.colorClass || 'bg-slate-100 text-slate-500';
export const getUI = (type) => NODE_UI[type] || {};
