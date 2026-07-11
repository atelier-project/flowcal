import { DisplayNodeBody } from './DisplayNodeBody';
import { ControlNodeBody } from './ControlNodeBody';
import { StructuredNodeBody } from './StructuredNodeBody';
import { ValueNodeBody } from './ValueNodeBody';
import { MiscNodeBody } from './MiscNodeBody';
import { GetGlobalNodeBody } from './GetGlobalNodeBody';

// Registry of extracted node-body renderers (issue #34). Each component declares
// the node types it handles via a static `handlesType(type)`. `resolveNodeBody`
// returns the component for a type, or null when the (still-inline) body switch
// in Node.jsx should handle it. Migrating a type here is how that monolithic
// switch shrinks over time — add the extracted component to REGISTRY and delete
// the corresponding inline block.
const REGISTRY = [DisplayNodeBody, ControlNodeBody, StructuredNodeBody, ValueNodeBody, MiscNodeBody, GetGlobalNodeBody];

export function resolveNodeBody(type) {
    return REGISTRY.find((Component) => Component.handlesType(type)) || null;
}
