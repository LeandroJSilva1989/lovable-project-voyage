import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, History as HistoryIcon, MapPin, Clock, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RideAnalysis {
  id: string;
  recommendation: string;
  distance_km: number;
  value_total: number;
  estimated_time: number;
  destination: string;
  value_per_km: number;
  created_at: string;
}

export default function History() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<RideAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ride_analysis')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRides(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'accept': return 'bg-success text-success-foreground';
      case 'evaluate': return 'bg-warning text-warning-foreground';
      case 'decline': return 'bg-danger text-danger-foreground';
      default: return 'bg-muted';
    }
  };

  const getRecommendationText = (recommendation: string) => {
    switch (recommendation) {
      case 'accept': return 'Aceitar';
      case 'evaluate': return 'Avaliar';
      case 'decline': return 'Recusar';
      default: return recommendation;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Histórico</h1>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando histórico...
          </div>
        ) : rides.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma análise realizada ainda
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <Card key={ride.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {ride.destination || 'Destino não identificado'}
                      </CardTitle>
                      <CardDescription>
                        {new Date(ride.created_at).toLocaleString('pt-BR')}
                      </CardDescription>
                    </div>
                    <Badge className={getRecommendationColor(ride.recommendation)}>
                      {getRecommendationText(ride.recommendation)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Distância</p>
                      <p className="font-semibold">{ride.distance_km?.toFixed(1)} km</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Valor</p>
                      <p className="font-semibold">R$ {ride.value_total?.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        R$/km
                      </p>
                      <p className="font-semibold">R$ {ride.value_per_km?.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Tempo
                      </p>
                      <p className="font-semibold">{ride.estimated_time} min</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}