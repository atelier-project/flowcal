import { DisplayNodeBody } from './DisplayNodeBody';
import { ControlNodeBody } from './ControlNodeBody';

// Registry of extracted node-body renderers (issue #34). Each component declares
// the node types it handles via a static `handlesType(type)`. `resolveNodeBody`
// returns the component for a type, or null when the (still-inline) body switch
// in Node.jsx should handle it. Migrating a type here is how that monolithic
// switch shrinks over time — add the extracted component to REGISTRY and delete
// the corresponding inline block.
const REGISTRY = [DisplayNodeBody, ControlNodeBody];

export function resolveNodeBody(type) {
    return REGISTRY.find((Component) => Component.handlesType(type)) || null;
}
