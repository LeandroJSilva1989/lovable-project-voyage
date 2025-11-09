import { registerPlugin } from '@capacitor/core';

export interface AccessibilityServicePlugin {
  /**
   * Verifica se o serviço de acessibilidade está ativo
   */
  isServiceEnabled(): Promise<{ enabled: boolean }>;
  
  /**
   * Abre configurações de acessibilidade
   */
  openAccessibilitySettings(): Promise<void>;
  
  /**
   * Inicia monitoramento de eventos
   */
  startMonitoring(): Promise<void>;
  
  /**
   * Para monitoramento
   */
  stopMonitoring(): Promise<void>;
  
  /**
   * Adiciona listener para eventos de apps de transporte
   */
  addListener(
    eventName: 'rideOfferDetected',
    listenerFunc: (data: { appName: string; timestamp: number }) => void
  ): Promise<void>;
}

const AccessibilityService = registerPlugin<AccessibilityServicePlugin>('AccessibilityService');

export default AccessibilityService;
