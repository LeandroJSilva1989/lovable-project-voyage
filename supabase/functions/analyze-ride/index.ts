import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, userSettings } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Analyzing ride image with Lovable AI...");

    // Call Lovable AI to analyze the image
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um assistente especializado em analisar capturas de tela de aplicativos de transporte (Uber, 99, etc). Extraia TODOS os dados visíveis sobre a corrida: distância em km, valor em R$, tempo estimado em minutos, e destino. Responda APENAS em JSON válido."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta captura de tela de uma solicitação de corrida e extraia: distância (em km), valor total (em R$), tempo estimado (em minutos) e destino. Retorne um JSON com as chaves: distance_km, value_total, estimated_time_minutes, destination."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices[0].message.content;
    
    console.log("AI Response:", content);

    // Parse the JSON from AI response
    let extractedData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      extractedData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    // Calculate value per km
    const distanceKm = parseFloat(extractedData.distance_km) || 0;
    const valueTotal = parseFloat(extractedData.value_total) || 0;
    const valuePerKm = distanceKm > 0 ? valueTotal / distanceKm : 0;

    // Determine recommendation based on user settings
    let recommendation = 'decline';
    const minValuePerKm = parseFloat(userSettings.min_value_per_km) || 2.5;
    const maxDistance = parseFloat(userSettings.max_distance_km) || 20;

    if (valuePerKm >= minValuePerKm && distanceKm <= maxDistance) {
      recommendation = 'accept';
    } else if (valuePerKm >= minValuePerKm * 0.8 || distanceKm <= maxDistance * 1.2) {
      recommendation = 'evaluate';
    }

    // Save to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (user) {
      await supabase.from('ride_analysis').insert({
        user_id: user.id,
        extracted_data: extractedData,
        recommendation,
        distance_km: distanceKm,
        value_total: valueTotal,
        estimated_time: extractedData.estimated_time_minutes,
        destination: extractedData.destination,
        value_per_km: valuePerKm,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...extractedData,
          value_per_km: valuePerKm.toFixed(2),
          recommendation,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-ride:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});