/**
 * Node Descriptions for tooltips
 */

export const NODE_DESCRIPTIONS = {
    // Data
    INPUT: 'A number input with optional slider. Use to provide numeric values to your flow.',
    TEXT_INPUT: 'A text input field. Outputs the entered string value.',
    SELECT: 'Pick one option from a defined list (dropdown or radio buttons). Each option has a label and a value; outputs the selected value (number or string).',
    DATE_INPUT: 'A date/time picker. Outputs timestamp in milliseconds.',
    RANGE: 'Generates an array of numbers from start to end with step increment.',
    COLLECTOR: 'Collects multiple inputs into a single array.',
    FORM: 'Creates an object with named fields. Each field can have a default value or connected input.',

    // String
    STRING_CONCAT: 'Joins multiple text inputs together into one string.',
    STRING_SPLIT: 'Splits text by a delimiter and returns an array of parts.',
    STRING_REPLACE: 'Replaces all occurrences of a substring with another string.',
    STRING_UPPER: 'Converts text to UPPERCASE.',
    STRING_LOWER: 'Converts text to lowercase.',
    STRING_LENGTH: 'Returns the number of characters in the text.',
    STRING_TRIM: 'Removes whitespace from the start and end of text.',
    STRING_SUBSTRING: 'Extracts a portion of text from start index to end index.',

    // Date
    DATE_NOW: 'Returns the current timestamp in milliseconds.',
    DATE_FORMAT: 'Formats a timestamp into a readable date/time string.',
    DATE_PARSE: 'Parses a date string into a timestamp.',
    DATE_DIFF: 'Calculates the difference between two dates.',

    // Array
    GET: 'Gets an item from an array by index.',
    LENGTH: 'Returns the number of items in an array.',
    SLICE: 'Extracts a portion of an array from start to end index.',
    SORT: 'Sorts an array in ascending or descending order.',
    ARRAY_FLATTEN: 'Flattens nested arrays into a single array.',

    // Object
    GET_KEY: 'Gets a value from an object by key name.',
    OBJECT_COMBINE: 'Merges multiple objects into one.',
    OBJECT_FLATTEN: 'Flattens nested objects into a single-level object.',
    OBJECT_KEYS: 'Returns an array of all keys in an object.',
    OBJECT_VALUES: 'Returns an array of all values in an object.',
    UNPACK: 'Extract specific keys from an object as separate outputs. Supports dot notation for nested values (e.g., VMs.Qty).',
    PACK: 'Combine multiple named inputs into a single object.',

    // Logic
    COMPARE: 'Compares two values. Returns true/false based on operator (=, ≠, <, >, ≤, ≥).',
    IF: 'Conditional logic. Returns valueIfTrue or valueIfFalse based on condition.',
    LOOKUP: 'Maps an input key to a value via defined cases, e.g. {2:"e2-standard-2", 8:"e2-standard-8"}. Match exactly, or round up/down to the nearest threshold. Outputs the matched value (string or number), or a default if nothing matches.',

    // Math
    SUM: 'Adds all input numbers together.',
    SUB: 'Subtracts numbers left-to-right: a − b − c… (e.g. 10, 3, 2 → 5). This is sequential subtraction, not a sum of negatives.',
    MUL: 'Multiplies all input numbers together.',
    DIV: 'Divides the first number by the second.',
    MIN: 'Returns the smallest value from inputs.',
    MAX: 'Returns the largest value from inputs.',
    ROUND: 'Rounds a number to specified decimal places.',
    FLOOR: 'Rounds a number down to the nearest integer.',
    CEIL: 'Rounds a number up to the nearest integer.',
    RANDOM: 'Generates a random number between min and max.',

    // Visuals
    GAUGE: 'Displays a value as a circular gauge (0-100%).',
    PROGRESS: 'Displays a value as a progress bar.',
    LINE_CHART: 'Plots array values as a line chart.',
    BAR_CHART: 'Displays array values as a bar chart.',
    TABLE: 'Displays data in a table format.',
    TEMPLATE: 'Renders text with {{placeholder}} substitution.',
    FINAL: 'Marks the final output of your flow. Shows the result prominently, with an optional multi-line caption (use \\n for line breaks).',
    REPORT: 'Groups multiple results into a single titled panel of labeled rows. Rows auto-label from their connected nodes; labels are editable.',

    // Advanced
    CUSTOM: 'Write custom JavaScript code. Use inputs object and return result.',
    GROUP: 'Contains a subgraph of nodes. Double-click to edit contents.',
    GROUP_INPUT: 'Receives values passed into the group from outside.',
    GROUP_INPUT_LIST: 'Receives multiple values passed into the group from outside.',
    GROUP_OUTPUT: 'Sends values out of the group to the parent flow.',
    GROUP_OUTPUT_LIST: 'Aggregates multiple values inside the group and sends as an array to the parent flow.',
    COMMENT: 'Add notes and documentation to your flow. Does not affect computation.',
    TEXT_LABEL: 'Add floating text labels and titles to your canvas. Customize font, size, and color.',
    FUNCTION: 'Define named parameters and write a formula. Each parameter becomes an input port.',
    FRAME: 'A visual outline box for grouping elements. Stays behind other nodes.',

    // Iterator
    MAP: 'Transform each item in an array. Double-click to define the per-item logic.',
    FILTER: 'Filter items from an array based on a condition. Double-click to define the filter logic.',
    REDUCE: 'Reduce an array to a single value using an accumulator. Double-click to define the reduce logic.',
    MAP_ITEM: 'The current item being processed in a MAP iteration.',
    MAP_INDEX: 'The current index (0-based) in a MAP iteration.',
    MAP_OUTPUT: 'The transformed value for this iteration. Connect your result here.',
    FILTER_ITEM: 'The current item being processed in a FILTER iteration.',
    FILTER_INDEX: 'The current index (0-based) in a FILTER iteration.',
    FILTER_INCLUDE: 'Boolean condition. If true, the current item is included in the result.',
    REDUCE_ITEM: 'The current item being processed in a REDUCE iteration.',
    REDUCE_INDEX: 'The current index (0-based) in a REDUCE iteration.',
    REDUCE_ACCUMULATOR: 'The accumulated value from previous iterations.',
    REDUCE_OUTPUT: 'The new accumulator value after processing this item.',

    // Wireless
    WARP_IN: 'Send a value wirelessly. Tag it with a name.',
    WARP_OUT: 'Receive a value wirelessly from a matching WARP_IN tag.',
};

export const getDescription = (type) => NODE_DESCRIPTIONS[type] || '';
