import { DB } from './db.js';
import { APIService } from './api.service.js';
import { CONFIG } from './constants.js';
import { NoirProKit } from './noir-pro-kit.js';

/**
 * CASE SERVICE
 * Logic for managing game state and mystery generation.
 */
export const CaseService = {
    async createNewCase() {
        const mysteryData = await APIService.generateMystery();
        if (!mysteryData.id) {
            mysteryData.id = NoirProKit.Utils.generateUUID();
        }
        
        // Persist to local DB (IndexedDB)
        await DB.put(CONFIG.STORES.CASES, mysteryData);
        
        // Update reactive state
        NoirProKit.State.set('currentCase', mysteryData);
        return mysteryData;
    },

    async getActiveCase() {
        // First check internal state
        const stateCase = NoirProKit.State.get('currentCase');
        if (stateCase) return stateCase;
        
        // Then check disk/indexedDB (Pseudo-query logic)
        // In a real Supabase scenario, this would be: 
        // const { data } = await supabase.from('cases').select()...
        return null;
    },

    async deleteCurrentCase() {
        const currentCase = NoirProKit.State.get('currentCase');
        if (currentCase) {
            await DB.delete(CONFIG.STORES.CASES, currentCase.id);
        }
        NoirProKit.State.set('currentCase', null);
        NoirProKit.State.clearDisk();
    }
};
