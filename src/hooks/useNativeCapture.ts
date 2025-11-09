import { useEffect, useState, useCallback } from 'react';
import ScreenCapture from '@/plugins/ScreenCapture';
import OverlayWindow from '@/plugins/OverlayWindow';
import AccessibilityService from '@/plugins/AccessibilityService';
import { useToast } from '@/hooks/use-toast';

interface RideData {
  distance_km: number;
  value_total: number;
  estimated_time_minutes: number;
  destination: string;
  value_per_km: number;
  recommendation: 'accept' | 'evaluate' | 'decline';
}

export const useNativeCapture = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const { toast } = useToast();

  // Verifica permissões ao montar
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const overlayPerm = await OverlayWindow.hasOverlayPermission();
      const accessibilityEnabled = await AccessibilityService.isServiceEnabled();
      setHasPermissions(overlayPerm.granted && accessibilityEnabled.enabled);
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setHasPermissions(false);
    }
  };

  const requestAllPermissions = async () => {
    try {
      // 1. Permissão de overlay
      const overlayResult = await OverlayWindow.requestOverlayPermission();
      if (!overlayResult.granted) {
        toast({
          title: "Permissão necessária",
          description: "Ative a permissão de sobreposição nas configurações",
          variant: "destructive"
        });
        return false;
      }

      // 2. Permissão de captura de tela
      const captureResult = await ScreenCapture.requestPermission();
      if (!captureResult.granted) {
        toast({
          title: "Permissão negada",
          description: "É necessário permitir a captura de tela",
          variant: "destructive"
        });
        return false;
      }

      // 3. Serviço de acessibilidade
      const accessibilityEnabled = await AccessibilityService.isServiceEnabled();
      if (!accessibilityEnabled.enabled) {
        await AccessibilityService.openAccessibilitySettings();
        toast({
          title: "Ative o serviço",
          description: "Ative o Race Sense Aid nas configurações de acessibilidade",
        });
        return false;
      }

      setHasPermissions(true);
      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      toast({
        title: "Erro",
        description: "Erro ao solicitar permissões",
        variant: "destructive"
      });
      return false;
    }
  };

  const startContinuousMonitoring = useCallback(async () => {
    if (!hasPermissions) {
      const granted = await requestAllPermissions();
      if (!granted) return;
    }

    try {
      // Inicia captura contínua a cada 5 segundos
      await ScreenCapture.startContinuousCapture({ intervalMs: 5000 });
      
      // Inicia monitoramento de acessibilidade
      await AccessibilityService.startMonitoring();

      setIsCapturing(true);

      // Listener para capturas de tela
      await ScreenCapture.addListener('screenCaptured', async (data) => {
        console.log('Tela capturada:', data.timestamp);
        // Aqui você enviaria para análise na edge function
        await analyzeScreenshot(data.base64);
      });

      // Listener para detecção de ofertas de corrida
      await AccessibilityService.addListener('rideOfferDetected', (data) => {
        console.log('Oferta detectada no app:', data.appName);
      });

      toast({
        title: "Monitoramento ativo",
        description: "Analisando ofertas de corrida automaticamente",
      });
    } catch (error) {
      console.error('Erro ao iniciar monitoramento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o monitoramento",
        variant: "destructive"
      });
    }
  }, [hasPermissions, toast]);

  const stopContinuousMonitoring = useCallback(async () => {
    try {
      await ScreenCapture.stopContinuousCapture();
      await AccessibilityService.stopMonitoring();
      setIsCapturing(false);

      toast({
        title: "Monitoramento pausado",
        description: "Captura automática desativada",
      });
    } catch (error) {
      console.error('Erro ao parar monitoramento:', error);
    }
  }, [toast]);

  const analyzeScreenshot = async (base64Image: string) => {
    try {
      // Aqui você chamaria a edge function de análise
      const response = await fetch('/api/analyze-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      const data: RideData = await response.json();
      
      // Mostra overlay com resultado
      await showOverlayWithResult(data);
    } catch (error) {
      console.error('Erro ao analisar screenshot:', error);
    }
  };

  const showOverlayWithResult = async (data: RideData) => {
    try {
      await OverlayWindow.showOverlay({
        recommendation: data.recommendation,
        distance_km: data.distance_km,
        value_total: data.value_total,
        estimated_time_minutes: data.estimated_time_minutes,
        destination: data.destination,
        value_per_km: data.value_per_km
      });

      // Overlay fecha automaticamente após 10 segundos ou ao tocar
      setTimeout(async () => {
        await OverlayWindow.hideOverlay();
      }, 10000);
    } catch (error) {
      console.error('Erro ao mostrar overlay:', error);
    }
  };

  return {
    isCapturing,
    hasPermissions,
    requestAllPermissions,
    startContinuousMonitoring,
    stopContinuousMonitoring,
    checkPermissions
  };
};
