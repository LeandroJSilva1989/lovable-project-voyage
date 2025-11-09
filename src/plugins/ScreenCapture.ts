import { registerPlugin } from '@capacitor/core';

export interface ScreenCapturePlugin {
  /**
   * Solicita permissão para captura de tela
   */
  requestPermission(): Promise<{ granted: boolean }>;
  
  /**
   * Captura a tela atual
   */
  captureScreen(): Promise<{ base64: string }>;
  
  /**
   * Inicia captura contínua (monitoring)
   */
  startContinuousCapture(options: { intervalMs: number }): Promise<void>;
  
  /**
   * Para captura contínua
   */
  stopContinuousCapture(): Promise<void>;
  
  /**
   * Adiciona listener para capturas
   */
  addListener(
    eventName: 'screenCaptured',
    listenerFunc: (data: { base64: string; timestamp: number }) => void
  ): Promise<void>;
}

const ScreenCapture = registerPlugin<ScreenCapturePlugin>('ScreenCapture');

export default ScreenCapture;
