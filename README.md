<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Gs48HRPYGnIUVlTNrirqmMKibYDy6Nvs

## Run Locally

**Prerequisites:**  Node.js (versión 18 o superior)

### Instalación de Node.js

Si no tienes Node.js instalado:

1. **Descarga Node.js:**
   - Visita: https://nodejs.org/
   - Descarga la versión LTS (Long Term Support)
   - Ejecuta el instalador y sigue las instrucciones

2. **Verifica la instalación:**
   ```bash
   node --version
   npm --version
   ```

### Pasos para ejecutar el proyecto

1. **Instala las dependencias:**
   ```bash
   npm install
   ```

2. **Configura la API Key de Gemini:**
   - Abre el archivo `.env.local` (ya creado)
   - Reemplaza `tu_api_key_aqui` con tu API key real
   - Puedes obtener tu API key en: https://aistudio.google.com/app/apikey
   - El proyecto acepta cualquiera de estos nombres de variable:
     - `VITE_API_KEY`
     - `API_KEY`
     - `GOOGLE_API_KEY`
     - `GEMINI_API_KEY`

3. **Ejecuta el proyecto en modo desarrollo:**
   ```bash
   npm run dev
   ```

4. **Abre tu navegador:**
   - El proyecto se ejecutará en `http://localhost:5173` (o el puerto que Vite asigne)
   - La URL aparecerá en la terminal

### Nota importante

Si no configuras la API key, el proyecto funcionará en "modo demo" con funcionalidades limitadas de IA.
