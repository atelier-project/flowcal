import { supabase } from '../lib/supabase';

export const flowService = {
    /**
     * List all flows visible to the user (Owned + Team + Public)
     */
    async listFlows() {
        const { data, error } = await supabase
            .from('flows')
            .select('id, name, updated_at, is_public, owner_id, profiles:owner_id(full_name, email)')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Create a new empty flow
     */
    async createFlow(name = 'Untitled Flow', teamId = null) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('flows')
            .insert({
                name,
                owner_id: user.id,
                team_id: teamId,
                data: { nodes: [], edges: [] } // Initial empty state
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get a single flow by ID
     */
    async getFlow(id) {
        const { data, error } = await supabase
            .from('flows')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update flow data (nodes/edges) and title
     */
    async updateFlow(id, updates) {
        const { data, error } = await supabase
            .from('flows')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a flow
     */
    async deleteFlow(id) {
        const { error } = await supabase
            .from('flows')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Duplicate an existing flow
     */
    async duplicateFlow(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // 1. Get original flow data
        const original = await this.getFlow(id);
        if (!original) throw new Error('Flow not found');

        // 2. Create new flow with copy suffix
        const { data, error } = await supabase
            .from('flows')
            .insert({
                name: `${original.name} (Copy)`,
                owner_id: user.id, // Current user becomes owner of copy
                data: original.data, // Copy nodes/edges
                is_public: false // Default to private
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
