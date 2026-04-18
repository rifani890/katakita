declare global {
  interface Window {
    handleStatClick?: (type: string) => void;
    handleOfficialClick?: (label: string) => void;
    handleMediaTrendClick?: (shorthand: string) => void;
    handleRecentNewsClick?: (key: string) => void;
    filterByParam?: (field: string, label: string, value: any) => void;
    openNewsModal?: (key: string) => void;
  }
}

export function registerStatsActions() {
    console.log("[DashboardActions] Registering external dashboard actions...");
    
    // Attaching actions to the window object to be used by inline HTML onclick handlers
    window.handleStatClick = function(type) {
        // Fallback checks
        if (!window.filterByParam) {
            console.error("[DashboardActions] filterByParam function not found.");
            return;
        }

        switch (type) {
            case 'total':
                window.filterByParam('potensi', 'Semua Berita', null);
                break;
            case 'positive':
                window.filterByParam('potensi', 'Sentimen Positif', 'Positif');
                break;
            case 'neutral':
                window.filterByParam('potensi', 'Sentimen Netral', 'Netral');
                break;
            case 'negative':
                window.filterByParam('potensi', 'Sentimen Negatif', 'Negatif');
                break;
            default:
                console.warn("[DashboardActions] Unknown type:", type);
        }
    };

    // Removing redundant overwrites that conflict with index.html implementations
    // window.handleOfficialClick = function(label) { ... }
    // window.handleMediaTrendClick = function(shorthand) { ... }
    
    window.handleRecentNewsClick = function(key) {
        if (window.openNewsModal) {
            window.openNewsModal(key);
        } else {
            console.warn("[DashboardActions] openNewsModal function is not ready.");
        }
    };
}
