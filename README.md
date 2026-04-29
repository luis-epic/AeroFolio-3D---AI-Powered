# AeroFolio 3D | Interactive AI Portfolio

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-repo%2Faerofolio-3d&env=VITE_GEMINI_API_KEY)

AeroFolio 3D is a highly interactive, futuristic 3D portfolio built with React, Three.js (React Three Fiber), and Gemini AI. It provides an immersive cyber-aesthetic experience where users can navigate through a 3D environment or use a terminal-like holographic interface powered by AI to explore your projects, experience, and contact details.

![AeroFolio 3D Preview](./preview.png) *(Note: Add a screenshot of your portfolio here)*

## 🚀 Features

- **Interactive 3D Environment**: Built with React Three Fiber, featuring animated drones, data streams, and interactive waypoints.
- **AI-Powered Holographic Chat**: Integrated with Gemini AI (`@google/genai`) to interactively answer questions about your work and background.
- **Cyberpunk UI & Visual Polish**: Custom CRT scanlines, vignette overlays, glassmorphic panels, and glowing holographic effects.
- **Bento Grid Projects**: Modern, responsive grid layouts for showcasing your projects and tech stack effectively.
- **Multi-language Support**: Integrated context-based language switcher (`English` / `Spanish`).
- **Immersive Audio SFX**: UI interactions and overlay navigations feature subtle futuristic sound effects.
- **Responsive Design**: Flawless experience on both desktop and mobile devices.

## 🛠 Tech Stack

- **Framework**: [React 18](https://reactjs.org/) & [Vite](https://vitejs.dev/)
- **3D Graphics**: [Three.js](https://threejs.org/) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- **Physics/Collisions**: [Rapier](https://rapier.rs/) + `@react-three/rapier`
- **Animations**: [Motion API](https://motion.dev/) (Framer Motion)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`)
- **Post-Processing**: `@react-three/postprocessing`

## 🏗 Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `yarn`

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/aerofolio-3d.git
   cd aerofolio-3d
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Gemini API Key.
   ```env
   VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:5173](http://localhost:5173).

## 🚀 Deployment (Vercel)

AeroFolio 3D is fully optimized to be deployed to Vercel without manual configuration.

### Option 1: Vercel CLI
1. Install the Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project root and follow the prompts.
3. Add your `VITE_GEMINI_API_KEY` in the Vercel Dashboard Environment Variables settings.

### Option 2: GitHub Integration (Recommended)
1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository.
4. Open the **Environment Variables** section and add:
   - **Name**: `VITE_GEMINI_API_KEY`
   - **Value**: `[Your Gemini API Key]`
5. Click **Deploy**.

## 📂 Project Structure

- `/src/components` - React components including 3D elements (`Experience.tsx`, `Drone.tsx`) and UI overlays (`Overlay.tsx`).
- `/src/services` - Logic for services, especially `geminiService.ts` for AI chatting.
- `/src/contexts` - Context providers like `LanguageContext.tsx`.
- `/src/translations.ts` - Multilingual dictionary content.
- `/index.html` - Contains the global CSS variables and CRT effects styling.

## 🤝 Contributing

Contributions are welcome! If you'd like to improve the portfolio, please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/cool-update`)
3. Commit your changes (`git commit -m 'Added cool update'`)
4. Push to the branch (`git push origin feature/cool-update`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
