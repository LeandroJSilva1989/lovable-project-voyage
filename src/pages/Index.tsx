import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Settings, History, Upload, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RideAnalysisPopup from "@/components/RideAnalysisPopup";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUser(user);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        
        // Get user settings
        const { data: settings } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const userSettings = settings || {
          min_value_per_km: 2.5,
          max_distance_km: 20,
        };

        // Call edge function
        const { data, error } = await supabase.functions.invoke('analyze-ride', {
          body: {
            imageBase64: base64,
            userSettings,
          }
        });

        if (error) throw error;

        if (data.success) {
          setAnalysisResult(data.data);
          toast({
            title: "Análise concluída!",
            description: "Corrida analisada com sucesso.",
          });
        }
      };
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Erro na análise",
        description: error.message || "Não foi possível analisar a imagem.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Race Sense Aid</h1>
              <p className="text-sm text-muted-foreground">Copiloto Inteligente</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Action Card */}
        <Card>
          <CardHeader>
            <CardTitle>Analisar Corrida</CardTitle>
            <CardDescription>
              Tire uma foto da tela do app de corridas para análise instantânea
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
              className="w-full h-20 text-lg"
              size="lg"
            >
              {analyzing ? (
                <>Analisando...</>
              ) : (
                <>
                  <Camera className="mr-2 h-6 w-6" />
                  Tirar Foto da Corrida
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                }
              }}
              disabled={analyzing}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Ou Carregar Imagem
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/settings")}>
            <CardContent className="pt-6 text-center space-y-2">
              <Settings className="h-8 w-8 mx-auto text-primary" />
              <p className="font-semibold">Configurações</p>
              <p className="text-xs text-muted-foreground">Defina suas metas</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/history")}>
            <CardContent className="pt-6 text-center space-y-2">
              <History className="h-8 w-8 mx-auto text-primary" />
              <p className="font-semibold">Histórico</p>
              <p className="text-xs text-muted-foreground">Veja análises anteriores</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Como funciona?</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. Configure suas metas nas configurações</li>
              <li>2. Tire uma foto da tela quando aparecer uma corrida</li>
              <li>3. Receba a recomendação instantânea com o sistema de semáforo</li>
              <li>🟢 Verde = Aceitar | 🟡 Amarelo = Avaliar | 🔴 Vermelho = Recusar</li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Floating Popup */}
      {analysisResult && (
        <RideAnalysisPopup
          data={analysisResult}
          onClose={() => setAnalysisResult(null)}
        />
      )}
    </div>
  );
};

export default Index;
