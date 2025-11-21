
export type Language = 'en' | 'es' | 'zh';

export const TRANSLATIONS = {
  en: {
    home: {
      role: "Full Stack Creative Engineer",
      description: "Explore the 3D workspace. Click the elements to navigate:",
      objects: {
        laptop: "Laptop (Projects)",
        brain: "Brain (AI Chat)",
        phone: "Phone (Contact)"
      }
    },
    projects: {
      title: "Projects",
      items: [
        {
          id: 0,
          title: "AeroFolio 3D (This Site)",
          tech: "R3F, Gemini AI, TypeScript, Next.js",
          description: "An immersive spatial web experience merging 3D interactivity with Generative AI. Features a physics-based environment, LLM-powered voice assistant, and hybrid DOM/WebGL navigation. Optimized for performance."
        },
        {
          id: 1,
          title: "Neural Vision Edge",
          tech: "Python, TensorFlow Lite, FastAPI",
          description: "Serverless computer vision architecture capable of 60 FPS object detection on IoT devices. Implements custom quantization pipelines to reduce model size by 75% without accuracy loss."
        },
        {
          id: 2,
          title: "EcoData Geospatial",
          tech: "React, WebGL, D3.js, Node.js",
          description: "High-performance dashboard visualizing terabytes of real-time climate data. Uses instanced rendering for millions of data points and WebSockets for live telemetry updates."
        },
        {
          id: 3,
          title: "CryptoSentinel DeFi",
          tech: "Solidity, Graph Protocol, Next.js",
          description: "Automated smart contract auditor utilizing historical on-chain data to predict liquidity exploits. Features a decentralized dashboard for real-time transaction monitoring."
        }
      ]
    },
    about: {
      title: "Neural Assistant",
      subtitle: "Powered by Gemini 2.5 Flash",
      placeholder: "Ask about my experience...",
      send: "Send",
      initialMessage: "Hello! I'm the AI assistant for this portfolio. Ask me about Luis's skills, experience, or favorite tech stack."
    },
    contact: {
      title: "Let's Connect",
      description: "Currently open for freelance projects and full-time opportunities in Frontend Architecture and AI Integration.",
      email: "email@example.com",
      linkedin: "LinkedIn Profile",
      github: "GitHub Profile"
    },
    labels: {
      projects: "PROJECTS",
      about: "ABOUT / AI",
      contact: "CONTACT"
    },
    instructions: {
      home: "Click objects to navigate",
      section: "Press X or Click Close to return"
    }
  },
  es: {
    home: {
      role: "Ingeniero Creativo Full Stack",
      description: "Explora el espacio 3D. Haz clic en los elementos para navegar:",
      objects: {
        laptop: "Laptop (Proyectos)",
        brain: "Cerebro (Chat IA)",
        phone: "Teléfono (Contacto)"
      }
    },
    projects: {
      title: "Proyectos Destacados",
      items: [
        {
          id: 0,
          title: "AeroFolio 3D (Esta Web)",
          tech: "R3F, Gemini AI, TypeScript, Next.js",
          description: "Experiencia web inmersiva que fusiona interactividad 3D con IA Generativa. Incluye entorno basado en físicas, asistente de voz potenciado por LLM y navegación híbrida DOM/WebGL. Altamente optimizado."
        },
        {
          id: 1,
          title: "Neural Vision Edge",
          tech: "Python, TensorFlow Lite, FastAPI",
          description: "Arquitectura de visión por computadora serverless capaz de procesar 60 FPS en dispositivos IoT. Implementa pipelines de cuantización para reducir el modelo un 75% sin perder precisión."
        },
        {
          id: 2,
          title: "EcoData Geospatial",
          tech: "React, WebGL, D3.js, Node.js",
          description: "Dashboard de alto rendimiento que visualiza terabytes de datos climáticos en tiempo real. Usa renderizado instanciado para millones de puntos y WebSockets para telemetría en vivo."
        },
        {
          id: 3,
          title: "CryptoSentinel DeFi",
          tech: "Solidity, Graph Protocol, Next.js",
          description: "Auditor de contratos inteligentes automatizado que utiliza datos on-chain históricos para predecir exploits de liquidez. Incluye dashboard descentralizado de monitoreo."
        }
      ]
    },
    about: {
      title: "Asistente Neuronal",
      subtitle: "Potenciado por Gemini 2.5 Flash",
      placeholder: "Pregunta sobre mi experiencia...",
      send: "Enviar",
      initialMessage: "¡Hola! Soy el asistente IA de este portafolio. Pregúntame sobre las habilidades, experiencia o stack tecnológico de Luis."
    },
    contact: {
      title: "Conectemos",
      description: "Actualmente disponible para proyectos freelance y oportunidades full-time en Arquitectura Frontend e Integración de IA.",
      email: "correo@ejemplo.com",
      linkedin: "Perfil LinkedIn",
      github: "Perfil GitHub"
    },
    labels: {
      projects: "PROYECTOS",
      about: "SOBRE MI / IA",
      contact: "CONTACTO"
    },
    instructions: {
      home: "Haz clic en los objetos para navegar",
      section: "Presiona X o Cierra para volver"
    }
  },
  zh: {
    home: {
      role: "全栈创意工程师",
      description: "探索 3D 工作空间。点击元素进行导航：",
      objects: {
        laptop: "笔记本 (项目)",
        brain: "大脑 (AI 聊天)",
        phone: "手机 (联系方式)"
      }
    },
    projects: {
      title: "精选项目",
      items: [
        {
          id: 0,
          title: "AeroFolio 3D (本网站)",
          tech: "R3F, Gemini AI, TypeScript, Next.js",
          description: "融合 3D 交互与生成式 AI 的沉浸式空间网络体验。具有基于物理的环境、LLM 驱动的语音助手和混合 DOM/WebGL 导航。针对性能进行了深度优化。"
        },
        {
          id: 1,
          title: "神经视觉 Edge",
          tech: "Python, TensorFlow Lite, FastAPI",
          description: "无服务器计算机视觉架构，能够在物联网设备上以 60 FPS 处理。实施自定义量化管道，在不损失精度的情况下将模型大小减少 75%。"
        },
        {
          id: 2,
          title: "生态数据可视化",
          tech: "React, WebGL, D3.js, Node.js",
          description: "可视化 TB 级实时气候数据的高性能仪表板。使用实例化渲染处理数百万个数据点，并使用 WebSockets 进行实时遥测更新。"
        },
        {
          id: 3,
          title: "加密哨兵 DeFi",
          tech: "Solidity, Graph Protocol, Next.js",
          description: "自动化智能合约审计器，利用历史链上数据预测流动性漏洞。具有用于实时交易监控的去中心化仪表板。"
        }
      ]
    },
    about: {
      title: "神经助手",
      subtitle: "由 Gemini 2.5 Flash 驱动",
      placeholder: "询问我的经验...",
      send: "发送",
      initialMessage: "您好！我是这个作品集的 AI 助手。您可以问我关于 Luis 的技能、经验或技术栈的问题。"
    },
    contact: {
      title: "保持联系",
      description: "目前接受前端架构和 AI 集成方面的兼职项目和全职机会。",
      email: "电子邮箱",
      linkedin: "领英主页",
      github: "GitHub 主页"
    },
    labels: {
      projects: "项目",
      about: "关于 / AI",
      contact: "联系方式"
    },
    instructions: {
      home: "点击物体进行导航",
      section: "按 X 或点击关闭以返回"
    }
  }
};
