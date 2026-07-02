import { flowService } from '../services/flowService';

// The public share link for a flow. Opens the read-only sandbox at /guest/:flowId.
export const buildShareUrl = (id) => `${window.location.origin}/guest/${id}`;

// Make a flow public (if it isn't already) and copy its share link to the clipboard.
// `flow` is the flow record (or a shape with `is_public`) so we skip a redundant
// update when it's already shared. Returns the copied URL.
export const ensurePublicAndCopy = async (id, flow) => {
    if (!flow?.is_public) {
        await flowService.updateFlow(id, { is_public: true });
    }
    const url = buildShareUrl(id);
    await navigator.clipboard.writeText(url);
    return url;
};
