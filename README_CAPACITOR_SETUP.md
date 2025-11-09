# Setup Completo - Capacitor Android Nativo

## 📱 O que foi criado

1. ✅ **Plugins TypeScript** (interface)
   - `src/plugins/ScreenCapture.ts` - Captura de tela
   - `src/plugins/OverlayWindow.ts` - Janela sobreposta
   - `src/plugins/AccessibilityService.ts` - Serviço de acessibilidade

2. ✅ **Hook React** para usar os plugins
   - `src/hooks/useNativeCapture.ts` - Lógica completa de monitoramento

3. ✅ **Documentação completa do código nativo**
   - `NATIVE_SETUP.md` - TODO código Java/Kotlin necessário

## 🚀 Passos para Configuração (NO SEU COMPUTADOR)

### 1. Exportar e Clonar o Projeto

```bash
# No Lovable: Settings > Export to Github
# Depois clone o repositório
git clone seu-repositorio
cd seu-repositorio
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Inicializar Capacitor

```bash
# Já está configurado! Apenas executar:
npx cap init
```

### 4. Adicionar Plataforma Android

```bash
npx cap add android
```

### 5. Build do Projeto

```bash
npm run build
```

### 6. Adicionar Código Nativo

**AGORA SIGA O ARQUIVO `NATIVE_SETUP.md`** que contém:

- ✅ AndroidManifest.xml completo com permissões
- ✅ ScreenCapturePlugin.java (captura de tela)
- ✅ OverlayWindowPlugin.java (overlay)
- ✅ OverlayService.java (serviço de overlay)
- ✅ Layout XML do overlay
- ✅ Configuração do serviço de acessibilidade

**Copie cada arquivo Java para:**
```
android/app/src/main/java/app/lovable/e7640f43e02c47fa9e3aaee94ebb8473/
```

**Copie os XMLs para:**
```
android/app/src/main/res/
```

### 7. Registrar Plugins no build.gradle

Adicione ao `android/app/build.gradle`:

```gradle
dependencies {
    // ... dependências existentes
    
    // Para CardView no overlay
    implementation 'androidx.cardview:cardview:1.0.0'
}
```

### 8. Sincronizar

```bash
npx cap sync
```

### 9. Abrir Android Studio

```bash
npx cap open android
```

### 10. Compilar e Testar

No Android Studio:
1. Build > Make Project
2. Run > Run 'app'
3. Escolha seu dispositivo/emulador

## 📲 Como Usar no App

Depois de compilado, o app terá:

### Fluxo de Permissões

```typescript
import { useNativeCapture } from '@/hooks/useNativeCapture';

function App() {
  const { 
    hasPermissions, 
    requestAllPermissions,
    startContinuousMonitoring 
  } = useNativeCapture();

  // Verificar e solicitar permissões
  const handleStart = async () => {
    if (!hasPermissions) {
      await requestAllPermissions();
    }
    await startContinuousMonitoring();
  };

  return (
    <button onClick={handleStart}>
      Iniciar Monitoramento
    </button>
  );
}
```

### O que acontece:

1. **Primeira vez:** Pede 3 permissões
   - Overlay (sobrepor apps)
   - Captura de tela
   - Serviço de acessibilidade

2. **Monitoramento contínuo:**
   - Captura tela a cada 5 segundos
   - Detecta quando você abre Uber/99/etc
   - Analisa automaticamente ofertas
   - Mostra overlay com recomendação

3. **Overlay aparece automaticamente:**
   - Quando detecta oferta de corrida
   - Mostra se vale a pena aceitar
   - Fecha sozinho em 10s ou ao tocar

## ⚠️ Limitações e Requisitos

### Dispositivo Real Necessário

Emuladores Android têm limitações:
- Captura de tela pode não funcionar
- Overlay pode ter bugs
- Serviço de acessibilidade limitado

### Permissões Especiais

O usuário precisa:
1. Ativar "Aparecer sobre outros apps" manualmente
2. Ativar serviço de acessibilidade nas configurações
3. Permitir captura de tela (popup único)

### Fabricantes com Restrições

Alguns fabricantes bloqueiam overlay:
- **Xiaomi (MIUI):** Configurações > Apps > Permissões
- **Huawei (EMUI):** Precisa desativar "Proteção da tela"
- **Samsung:** Geralmente funciona sem problemas

## 🐛 Troubleshooting

### Erro: "Plugin not implemented"

Significa que o código Java não foi adicionado ou não está registrado.

**Solução:**
1. Verifique se copiou todos os arquivos .java
2. Execute `npx cap sync` novamente
3. Rebuild no Android Studio

### Erro: "Permission denied"

**Solução:**
1. Vá em Configurações do Android
2. Apps > Race Sense Aid > Permissões
3. Ative todas as permissões

### Overlay não aparece

**Solução:**
1. Configurações > Apps > Configurações especiais
2. Aparecer sobre outros apps
3. Ative para Race Sense Aid

### Serviço de Acessibilidade não funciona

**Solução:**
1. Configurações > Acessibilidade
2. Serviços instalados
3. Ative "Race Sense Aid"

## 📚 Próximos Passos

1. **Testar cada permissão separadamente**
2. **Implementar lógica de análise OCR** (já tem a estrutura)
3. **Melhorar UI do overlay** (customizar layout XML)
4. **Adicionar configurações** (intervalo de captura, apps monitorados)
5. **Otimizar bateria** (ajustar frequência de captura)

## 🎯 Arquitetura Final

```
┌─────────────────┐
│   React Web     │ ← Interface principal
└────────┬────────┘
         │
┌────────▼────────┐
│ Capacitor Core  │ ← Bridge JS/Native
└────────┬────────┘
         │
    ┌────┴────┐
    │ Plugins │
    └────┬────┘
         │
┌────────┴────────────────┐
│  Native Android         │
│  - ScreenCapture        │
│  - OverlayWindow        │
│  - AccessibilityService │
└─────────────────────────┘
```

## 💡 Dicas Importantes

1. **Teste em dispositivo real primeiro**
2. **Comece com overlay simples** antes de adicionar captura
3. **Monitore consumo de bateria** durante testes
4. **Use logs extensivamente** para debug
5. **Peça permissões de forma gradual** (melhor UX)

## 📞 Suporte

Se encontrar problemas:
1. Verifique logs no Android Studio (Logcat)
2. Revise o arquivo NATIVE_SETUP.md
3. Teste cada plugin individualmente
4. Consulte documentação do Capacitor

---

**✨ Boa sorte com o desenvolvimento!**
