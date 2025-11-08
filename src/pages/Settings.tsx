import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    min_value_per_km: "2.50",
    max_distance_km: "20.00",
    background_enabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          min_value_per_km: data.min_value_per_km.toString(),
          max_distance_km: data.max_distance_km.toString(),
          background_enabled: data.background_enabled,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          min_value_per_km: parseFloat(settings.min_value_per_km),
          max_distance_km: parseFloat(settings.max_distance_km),
          background_enabled: settings.background_enabled,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "Suas metas foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Configurações</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Metas de Corrida</CardTitle>
            <CardDescription>
              Defina seus critérios para aceitar corridas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="min_value">Valor mínimo por km (R$)</Label>
              <Input
                id="min_value"
                type="number"
                step="0.10"
                value={settings.min_value_per_km}
                onChange={(e) => setSettings({ ...settings, min_value_per_km: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_distance">Distância máxima (km)</Label>
              <Input
                id="max_distance"
                type="number"
                step="0.5"
                value={settings.max_distance_km}
                onChange={(e) => setSettings({ ...settings, max_distance_km: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Análise em segundo plano</Label>
                <p className="text-sm text-muted-foreground">
                  Ative para receber alertas automáticos
                </p>
              </div>
              <Switch
                checked={settings.background_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, background_enabled: checked })}
              />
            </div>

            <Button onClick={saveSettings} disabled={loading} className="w-full">
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}