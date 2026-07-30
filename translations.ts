
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
          description: "An immersive spatial web experience merging 3D interactivity with Generative AI. Features a physics-based environment, LLM-powered voice assistant, and hybrid DOM/WebGL navigation. Optimized for performance.",
          link: "https://aerofolio-3d.vercel.app"
        },
        {
          id: 1,
          title: "Neural Vision Edge",
          tech: "Python, TensorFlow Lite, FastAPI",
          description: "Serverless computer vision architecture capable of 60 FPS object detection on IoT devices. Implements custom quantization pipelines to reduce model size by 75% without accuracy loss.",
          link: "https://neural-vision-edge.vercel.app"
        },
        {
          id: 2,
          title: "EcoData Geospatial",
          tech: "React, WebGL, D3.js, Node.js",
          description: "High-performance dashboard visualizing terabytes of real-time climate data. Uses instanced rendering for millions of data points and WebSockets for live telemetry updates.",
          link: "https://ecodata-geospatial.vercel.app"
        },
        {
          id: 3,
          title: "CryptoSentinel DeFi",
          tech: "Solidity, Graph Protocol, Next.js",
          description: "Automated smart contract auditor utilizing historical on-chain data to predict liquidity exploits. Features a decentralized dashboard for real-time transaction monitoring.",
          link: "https://crypto-sentinel-defi.vercel.app"
        },
        {
          id: 4,
          title: "Royal Vision Suite",
          tech: "React, Supabase, TypeScript, TailwindCSS, PostgreSQL",
          description: "Comprehensive ERP system designed for opticians and visual health centers. Manages clinical patient records, vision exams, automated scheduling, inventory control, and real-time sales reporting with secure Row Level Security (RLS) policies.",
          link: "https://royal-vision-suite.vercel.app"
        }
      ]
    },
    about: {
      title: "Neural Assistant",
      subtitle: "Powered by Gemini 2.5 Flash",
      placeholder: "Ask about my experience...",
      send: "Send",
      initialMessage: "Hello! I'm the AI assistant for this portfolio. Ask me about Luis's skills, experience, or favorite tech stack.",
      quickQuestions: [
        "What is your tech stack?",
        "Tell me about your experience",
        "Why should I hire you?",
        "Do you know Three.js?"
      ]
    },
    contact: {
      title: "Let's Connect",
      description: "Currently open for freelance projects and full-time opportunities in Frontend Architecture and AI Integration.",
      email: "luismartinez.developer@gmail.com",
      linkedin: "LinkedIn Profile",
      github: "GitHub Profile"
    },
    labels: {
      home: "HOME",
      projects: "PROJECTS",
      about: "ABOUT / AI",
      contact: "CONTACT"
    },
    instructions: {
      home: "Click objects to navigate",
      section: "Press X or Click Close to return"
    },
    stats: {
      online: "ONLINE",
      coreDirectives: "Core Directives",
      react: "React / Next.js",
      threejs: "Three.js / WebGL",
      ai: "Generative AI",
      systemLoad: "System Load",
      cpuOptimal: "CPU: 85% - OPTIMAL",
      signalOpen: "SIGNAL.STATUS: OPEN",
      repos: "Repositories",
      followers: "Followers",
      stars: "Stars",
      fetching: "FETCHING DATA..."
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
          description: "Experiencia web inmersiva que fusiona interactividad 3D con IA Generativa. Incluye entorno basado en físicas, asistente de voz potenciado por LLM y navegación híbrida DOM/WebGL. Altamente optimizado.",
          link: "https://aerofolio-3d.vercel.app"
        },
        {
          id: 1,
          title: "Neural Vision Edge",
          tech: "Python, TensorFlow Lite, FastAPI",
          description: "Arquitectura de visión por computadora serverless capaz de procesar 60 FPS en dispositivos IoT. Implementa pipelines de cuantización para reducir el modelo un 75% sin perder precisión.",
          link: "https://neural-vision-edge.vercel.app"
        },
        {
          id: 2,
          title: "EcoData Geospatial",
          tech: "React, WebGL, D3.js, Node.js",
          description: "Dashboard de alto rendimiento que visualiza terabytes de datos climáticos en tiempo real. Usa renderizado instanciado para millones de puntos y WebSockets para telemetría en vivo.",
          link: "https://ecodata-geospatial.vercel.app"
        },
        {
          id: 3,
          title: "CryptoSentinel DeFi",
          tech: "Solidity, Graph Protocol, Next.js",
          description: "Auditor de contratos inteligentes automatizado que utiliza datos on-chain históricos para predecir exploits de liquidez. Incluye dashboard descentralizado de monitoreo.",
          link: "https://crypto-sentinel-defi.vercel.app"
        },
        {
          id: 4,
          title: "Royal Vision Suite",
          tech: "React, Supabase, TypeScript, TailwindCSS, PostgreSQL",
          description: "Sistema de gestión integral para centros ópticos y optometrías. Administra pacientes, exámenes visuales, citas automáticas, control de inventario y facturación en tiempo real bajo estrictas políticas de seguridad (RLS).",
          link: "https://royal-vision-suite.vercel.app"
        }
      ]
    },
    about: {
      title: "Asistente Neuronal",
      subtitle: "Potenciado por Gemini 2.5 Flash",
      placeholder: "Pregunta sobre mi experiencia...",
      send: "Enviar",
      initialMessage: "¡Hola! Soy el asistente IA de este portafolio. Pregúntame sobre las habilidades, experiencia o stack tecnológico de Luis.",
      quickQuestions: [
        "¿Cuál es tu stack tecnológico?",
        "Háblame de tu experiencia",
        "¿Por qué contratarte?",
        "¿Sabes usar Three.js?"
      ]
    },
    contact: {
      title: "Conectemos",
      description: "Actualmente disponible para proyectos freelance y oportunidades full-time en Arquitectura Frontend e Integración de IA.",
      email: "luismartinez.developer@gmail.com",
      linkedin: "Perfil LinkedIn",
      github: "Perfil GitHub"
    },
    labels: {
      home: "INICIO",
      projects: "PROYECTOS",
      about: "SOBRE MI / IA",
      contact: "CONTACTO"
    },
    instructions: {
      home: "Haz clic en los objetos para navegar",
      section: "Presiona X o Cierra para volver"
    },
    stats: {
      online: "EN LÍNEA",
      coreDirectives: "Directivas Principales",
      react: "React / Next.js",
      threejs: "Three.js / WebGL",
      ai: "IA Generativa",
      systemLoad: "Carga del Sistema",
      cpuOptimal: "CPU: 85% - ÓPTIMO",
      signalOpen: "ESTADO.SEÑAL: ABIERTO",
      repos: "Repositorios",
      followers: "Seguidores",
      stars: "Estrellas",
      fetching: "OBTENIENDO DATOS..."
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
          description: "融合 3D 交互与生成式 AI 的沉浸式空间网络体验。具有基于物理的环境、LLM 驱动的语音助手和混合 DOM/WebGL 导航。针对性能进行了深度优化。",
          link: "https://aerofolio-3d.vercel.app"
        },
        {
          id: 1,
          title: "神经视觉 Edge",
          tech: "Python, TensorFlow Lite, FastAPI",
          description: "无服务器计算机视觉架构，能够在物联网设备上以 60 FPS 处理。实施自定义量化管道，在不损失精度的情况下将模型大小减少 75%。",
          link: "https://neural-vision-edge.vercel.app"
        },
        {
          id: 2,
          title: "生态数据可视化",
          tech: "React, WebGL, D3.js, Node.js",
          description: "可视化 TB 级实时气候数据的高性能仪表板。使用实例化渲染处理数百万个数据点，并使用 WebSockets 进行实时遥测更新。",
          link: "https://ecodata-geospatial.vercel.app"
        },
        {
          id: 3,
          title: "加密哨兵 DeFi",
          tech: "Solidity, Graph Protocol, Next.js",
          description: "自动化智能合约审计器，利用历史链上数据预测流动性漏洞。具有用于实时交易监控的去中心化仪表板。",
          link: "https://crypto-sentinel-defi.vercel.app"
        },
        {
          id: 4,
          title: "Royal Vision Suite",
          tech: "React, Supabase, TypeScript, TailwindCSS, PostgreSQL",
          description: "专为配镜中心和眼科视光中心设计的全面管理系统。管理患者临床记录、视力检查、自动预约、库存控制、以及具有行级安全（RLS）策略的实时销售报表。",
          link: "https://royal-vision-suite.vercel.app"
        }
      ]
    },
    about: {
      title: "神经助手",
      subtitle: "由 Gemini 2.5 Flash 驱动",
      placeholder: "询问我的经验...",
      send: "发送",
      initialMessage: "您好！我是这个作品集的 AI 助手。您可以问我关于 Luis 的技能、经验或技术栈的问题。",
      quickQuestions: [
        "你的技术栈是什么？",
        "讲讲你的经验",
        "为什么要录用你？",
        "你会用 Three.js 吗？"
      ]
    },
    contact: {
      title: "保持联系",
      description: "目前接受前端架构和 AI 集成方面的兼职项目和全职机会。",
      email: "luismartinez.developer@gmail.com",
      linkedin: "领英主页",
      github: "GitHub 主页"
    },
    labels: {
      home: "首页",
      projects: "项目",
      about: "关于 / AI",
      contact: "联系方式"
    },
    instructions: {
      home: "点击物体进行导航",
      section: "按 X 或点击关闭以返回"
    },
    stats: {
      online: "在线",
      coreDirectives: "核心指令",
      react: "React / Next.js",
      threejs: "Three.js / WebGL",
      ai: "生成式 AI",
      systemLoad: "系统负载",
      cpuOptimal: "CPU: 85% - 最佳",
      signalOpen: "信号状态: 开启",
      repos: "代码仓库",
      followers: "关注者",
      stars: "星标",
      fetching: "获取数据中..."
    }
  }
};
