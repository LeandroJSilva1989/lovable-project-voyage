import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RideData {
  distance_km: number;
  value_total: number;
  estimated_time_minutes: number;
  destination: string;
  value_per_km: number;
  recommendation: 'accept' | 'evaluate' | 'decline';
}

interface Props {
  data: RideData | null;
  onClose: () => void;
}

export default function RideAnalysisPopup({ data, onClose }: Props) {
  if (!data) return null;

  const getRecommendationStyles = () => {
    switch (data.recommendation) {
      case 'accept':
        return {
          bg: 'bg-success/10 border-success',
          icon: '🟢',
          title: 'ACEITAR',
          color: 'text-success'
        };
      case 'evaluate':
        return {
          bg: 'bg-warning/10 border-warning',
          icon: '🟡',
          title: 'AVALIAR',
          color: 'text-warning'
        };
      case 'decline':
        return {
          bg: 'bg-danger/10 border-danger',
          icon: '🔴',
          title: 'RECUSAR',
          color: 'text-danger'
        };
    }
  };

  const styles = getRecommendationStyles();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md"
        onClick={onClose}
      >
        <Card className={`${styles.bg} border-2 shadow-2xl`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{styles.icon}</span>
                <CardTitle className={`text-2xl font-bold ${styles.color}`}>
                  {styles.title}
                </CardTitle>
              </div>
            </div>
            <CardDescription className="flex items-center gap-1 text-sm">
              <MapPin className="h-3 w-3" />
              {data.destination || 'Destino não identificado'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Distância</p>
                <p className="text-lg font-bold">{data.distance_km?.toFixed(1)} km</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Tempo
                </p>
                <p className="text-lg font-bold">{data.estimated_time_minutes} min</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
                <p className="text-lg font-bold">R$ {data.value_total?.toFixed(2)}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  R$/km
                </p>
                <p className={`text-lg font-bold ${styles.color}`}>
                  R$ {data.value_per_km}
                </p>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Toque para fechar
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}