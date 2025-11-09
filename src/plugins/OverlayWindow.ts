import { registerPlugin } from '@capacitor/core';

export interface OverlayWindowPlugin {
  /**
   * Solicita permissão para exibir sobre outros apps
   */
  requestOverlayPermission(): Promise<{ granted: boolean }>;
  
  /**
   * Mostra o overlay com análise
   */
  showOverlay(options: {
    recommendation: 'accept' | 'evaluate' | 'decline';
    distance_km: number;
    value_total: number;
    estimated_time_minutes: number;
    destination: string;
    value_per_km: number;
  }): Promise<void>;
  
  /**
   * Esconde o overlay
   */
  hideOverlay(): Promise<void>;
  
  /**
   * Verifica se tem permissão
   */
  hasOverlayPermission(): Promise<{ granted: boolean }>;
}

const OverlayWindow = registerPlugin<OverlayWindowPlugin>('OverlayWindow');

export default OverlayWindow;
