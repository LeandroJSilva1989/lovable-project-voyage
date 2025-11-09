# Configuração Nativa Android - Race Sense Aid

## ⚠️ IMPORTANTE
Este guia contém TODO o código nativo Android necessário. Você precisará adicionar esses arquivos manualmente após executar `npx cap add android`.

## 1. Permissões no AndroidManifest.xml

Adicione no arquivo `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Permissões necessárias -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.BIND_ACCESSIBILITY_SERVICE" 
                     tools:ignore="ProtectedPermissions" />
    
    <application
        android:name=".MainApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        
        <!-- Atividade Principal -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
        <!-- Serviço de Overlay -->
        <service
            android:name=".services.OverlayService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="mediaProjection" />
        
        <!-- Serviço de Acessibilidade -->
        <service
            android:name=".services.RideSenseAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>
        
    </application>
</manifest>
```

## 2. Configuração do Serviço de Acessibilidade

Crie `android/app/src/main/res/xml/accessibility_service_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault|flagRetrieveInteractiveWindows|flagReportViewIds"
    android:canRetrieveWindowContent="true"
    android:description="@string/accessibility_service_description"
    android:notificationTimeout="100"
    android:packageNames="com.ubercab,com.ubercab.driver,net.one99.android.driver,br.com.trovit.didi,br.com.movile.iddrivers" />
```

## 3. Plugin de Captura de Tela

Crie `android/app/src/main/java/app/lovable/.../plugins/ScreenCapturePlugin.java`:

```java
package app.lovable.e7640f43e02c47fa9e3aaee94ebb8473.plugins;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.DisplayMetrics;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

@CapacitorPlugin(name = "ScreenCapture")
public class ScreenCapturePlugin extends Plugin {
    private static final int REQUEST_CODE = 1000;
    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private Handler handler;
    private boolean isContinuousCapture = false;
    private int captureInterval = 5000;

    @Override
    public void load() {
        projectionManager = (MediaProjectionManager) getContext()
                .getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        handler = new Handler(Looper.getMainLooper());
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Intent intent = projectionManager.createScreenCaptureIntent();
        startActivityForResult(call, intent, REQUEST_CODE);
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        
        PluginCall savedCall = getSavedCall();
        if (savedCall == null) return;

        if (requestCode == REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK) {
                mediaProjection = projectionManager.getMediaProjection(resultCode, data);
                setupVirtualDisplay();
                
                JSObject ret = new JSObject();
                ret.put("granted", true);
                savedCall.resolve(ret);
            } else {
                JSObject ret = new JSObject();
                ret.put("granted", false);
                savedCall.resolve(ret);
            }
        }
    }

    private void setupVirtualDisplay() {
        DisplayMetrics metrics = getContext().getResources().getDisplayMetrics();
        int width = metrics.widthPixels;
        int height = metrics.heightPixels;
        int density = metrics.densityDpi;

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
        
        virtualDisplay = mediaProjection.createVirtualDisplay(
                "ScreenCapture",
                width, height, density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.getSurface(),
                null, null
        );
    }

    @PluginMethod
    public void captureScreen(PluginCall call) {
        if (mediaProjection == null) {
            call.reject("Permission not granted");
            return;
        }

        Image image = imageReader.acquireLatestImage();
        if (image == null) {
            call.reject("Failed to capture screen");
            return;
        }

        String base64 = imageToBase64(image);
        image.close();

        JSObject ret = new JSObject();
        ret.put("base64", base64);
        call.resolve(ret);
    }

    @PluginMethod
    public void startContinuousCapture(PluginCall call) {
        int interval = call.getInt("intervalMs", 5000);
        this.captureInterval = interval;
        this.isContinuousCapture = true;
        
        continuousCaptureLoop();
        call.resolve();
    }

    @PluginMethod
    public void stopContinuousCapture(PluginCall call) {
        this.isContinuousCapture = false;
        call.resolve();
    }

    private void continuousCaptureLoop() {
        if (!isContinuousCapture) return;

        handler.postDelayed(() -> {
            if (imageReader != null) {
                Image image = imageReader.acquireLatestImage();
                if (image != null) {
                    String base64 = imageToBase64(image);
                    image.close();

                    JSObject data = new JSObject();
                    data.put("base64", base64);
                    data.put("timestamp", System.currentTimeMillis());
                    notifyListeners("screenCaptured", data);
                }
            }
            continuousCaptureLoop();
        }, captureInterval);
    }

    private String imageToBase64(Image image) {
        Image.Plane[] planes = image.getPlanes();
        ByteBuffer buffer = planes[0].getBuffer();
        int pixelStride = planes[0].getPixelStride();
        int rowStride = planes[0].getRowStride();
        int rowPadding = rowStride - pixelStride * image.getWidth();

        Bitmap bitmap = Bitmap.createBitmap(
                image.getWidth() + rowPadding / pixelStride,
                image.getHeight(),
                Bitmap.Config.ARGB_8888
        );
        bitmap.copyPixelsFromBuffer(buffer);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
        byte[] bytes = outputStream.toByteArray();
        
        return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
    }
}
```

## 4. Plugin de Overlay

Crie `android/app/src/main/java/app/lovable/.../plugins/OverlayWindowPlugin.java`:

```java
package app.lovable.e7640f43e02c47fa9e3aaee94ebb8473.plugins;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import app.lovable.e7640f43e02c47fa9e3aaee94ebb8473.services.OverlayService;

@CapacitorPlugin(name = "OverlayWindow")
public class OverlayWindowPlugin extends Plugin {

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
                
                JSObject ret = new JSObject();
                ret.put("granted", false);
                call.resolve(ret);
            } else {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
            }
        }
    }

    @PluginMethod
    public void hasOverlayPermission(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            granted = Settings.canDrawOverlays(getContext());
        }
        
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void showOverlay(PluginCall call) {
        Intent intent = new Intent(getContext(), OverlayService.class);
        intent.putExtra("recommendation", call.getString("recommendation"));
        intent.putExtra("distance_km", call.getDouble("distance_km"));
        intent.putExtra("value_total", call.getDouble("value_total"));
        intent.putExtra("estimated_time_minutes", call.getInt("estimated_time_minutes"));
        intent.putExtra("destination", call.getString("destination"));
        intent.putExtra("value_per_km", call.getDouble("value_per_km"));
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        
        call.resolve();
    }

    @PluginMethod
    public void hideOverlay(PluginCall call) {
        Intent intent = new Intent(getContext(), OverlayService.class);
        getContext().stopService(intent);
        call.resolve();
    }
}
```

## 5. Serviço de Overlay

Crie `android/app/src/main/java/app/lovable/.../services/OverlayService.java`:

```java
package app.lovable.e7640f43e02c47fa9e3aaee94ebb8473.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;

public class OverlayService extends Service {
    private WindowManager windowManager;
    private View overlayView;
    private static final String CHANNEL_ID = "OverlayServiceChannel";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Race Sense Aid")
                .setContentText("Monitorando corridas...")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .build();
        
        startForeground(1, notification);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String recommendation = intent.getStringExtra("recommendation");
            double distance = intent.getDoubleExtra("distance_km", 0);
            double valueTotal = intent.getDoubleExtra("value_total", 0);
            int time = intent.getIntExtra("estimated_time_minutes", 0);
            String destination = intent.getStringExtra("destination");
            double valuePerKm = intent.getDoubleExtra("value_per_km", 0);
            
            showOverlay(recommendation, distance, valueTotal, time, destination, valuePerKm);
        }
        return START_STICKY;
    }

    private void showOverlay(String recommendation, double distance, double valueTotal, 
                            int time, String destination, double valuePerKm) {
        if (overlayView != null) {
            windowManager.removeView(overlayView);
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        
        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        params.x = 0;
        params.y = 100;

        LayoutInflater inflater = (LayoutInflater) getSystemService(LAYOUT_INFLATER_SERVICE);
        overlayView = inflater.inflate(R.layout.overlay_layout, null);
        
        // Configure UI elements (você precisará criar o layout XML)
        TextView recommendationText = overlayView.findViewById(R.id.recommendation_text);
        TextView distanceText = overlayView.findViewById(R.id.distance_text);
        TextView valueText = overlayView.findViewById(R.id.value_text);
        TextView timeText = overlayView.findViewById(R.id.time_text);
        TextView destinationText = overlayView.findViewById(R.id.destination_text);
        TextView valuePerKmText = overlayView.findViewById(R.id.value_per_km_text);
        
        recommendationText.setText(recommendation.toUpperCase());
        distanceText.setText(String.format("%.1f km", distance));
        valueText.setText(String.format("R$ %.2f", valueTotal));
        timeText.setText(String.format("%d min", time));
        destinationText.setText(destination);
        valuePerKmText.setText(String.format("R$ %.2f", valuePerKm));

        overlayView.setOnClickListener(v -> {
            windowManager.removeView(overlayView);
            stopSelf();
        });

        windowManager.addView(overlayView, params);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (overlayView != null && windowManager != null) {
            windowManager.removeView(overlayView);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Overlay Service Channel",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
}
```

## 6. Layout do Overlay

Crie `android/app/src/main/res/layout/overlay_layout.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.cardview.widget.CardView xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_margin="16dp"
    app:cardCornerRadius="16dp"
    app:cardElevation="8dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="16dp">

        <TextView
            android:id="@+id/recommendation_text"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textSize="24sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/destination_text"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:textSize="14sp" />

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="16dp"
            android:orientation="horizontal">

            <LinearLayout
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:orientation="vertical">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Distância"
                    android:textSize="12sp" />

                <TextView
                    android:id="@+id/distance_text"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:textSize="18sp"
                    android:textStyle="bold" />
            </LinearLayout>

            <LinearLayout
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:orientation="vertical">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Tempo"
                    android:textSize="12sp" />

                <TextView
                    android:id="@+id/time_text"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:textSize="18sp"
                    android:textStyle="bold" />
            </LinearLayout>

            <LinearLayout
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:orientation="vertical">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Valor"
                    android:textSize="12sp" />

                <TextView
                    android:id="@+id/value_text"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:textSize="18sp"
                    android:textStyle="bold" />
            </LinearLayout>

            <LinearLayout
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:orientation="vertical">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="R$/km"
                    android:textSize="12sp" />

                <TextView
                    android:id="@+id/value_per_km_text"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:textSize="18sp"
                    android:textStyle="bold" />
            </LinearLayout>
        </LinearLayout>

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="center"
            android:layout_marginTop="8dp"
            android:text="Toque para fechar"
            android:textSize="12sp" />
    </LinearLayout>
</androidx.cardview.widget.CardView>
```

## 7. Próximos Passos

1. Execute `npx cap add android` no terminal
2. Copie todos os arquivos Java acima para as pastas corretas
3. Execute `npx cap sync`
4. Abra o projeto no Android Studio: `npx cap open android`
5. Compile e teste no dispositivo

## 8. Notas Importantes

- O serviço de acessibilidade precisa ser ativado manualmente pelo usuário nas configurações do Android
- A permissão de overlay também precisa ser concedida manualmente
- Teste primeiro em um dispositivo real, emulador pode ter limitações
- Alguns fabricantes (Xiaomi, Huawei) têm restrições adicionais

## 9. Recursos Adicionais

- Documentação Capacitor: https://capacitorjs.com/docs/plugins
- Media Projection API: https://developer.android.com/reference/android/media/projection/MediaProjection
- Accessibility Service: https://developer.android.com/guide/topics/ui/accessibility/service
