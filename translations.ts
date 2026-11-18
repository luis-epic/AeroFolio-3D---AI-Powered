
export type Language = 'en' | 'es' | 'zh';

export const TRANSLATIONS = {
  en: {
    home: {
      role: "Full Stack Creative Engineer",
      description: "I build fast, polished web products and integrate generative AI into them. Open to freelance projects and full-time roles.",
      cta: {
        sound: "Listen",
        mute: "Mute",
        replay: "Replay",

        next: "Next",
        quickView: "Quick view",
        fullView: "3D view"
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
      subtitle: "Powered by Gemini 3 Flash",
      placeholder: "Ask about my experience...",
      send: "Send",
      initialMessage: "Hello! I'm the AI assistant for this portfolio. Ask me about Luis's skills, experience, or favorite tech stack.",
      quickQuestions: [
        "What notes do you have in NotebookLM?",
        "Explain your Software Architecture notes",
        "What is your tech stack?",
        "How do you build with Three.js & AI?"
      ],
      knowledgeMode: {
        active: "Knowledge-Base-Aware",
        inactive: "General AI Mode",
        tooltip: "Toggle active NotebookLM knowledge base grounding",
        statusActive: "NOTEBOOKLM: ACTIVE // GROUNDED",
        statusInactive: "GENERAL AI MODE // UNGROUNDED",
        badge: "NotebookLM Synced",
        switchedToActive: "[SYSTEM]: Neural Assistant synchronized with NotebookLM Knowledge Vault (5 notebooks active).",
        switchedToInactive: "[SYSTEM]: Switched to General AI Mode. Responses are now open and ungrounded.",
        initializing: "INITIALIZING CONNECTION...",
        initialized: "CONNECTION INITIALIZED // VAULT READY",
        podsSynced: "5 Notebooks Synced",
        floatingTitle: "Knowledge-Base-Aware",
        floatingSubtitle: "NotebookLM Grounding",
        openAssistant: "Open Neural Assistant",
        notebooksListTitle: "Connected Knowledge Pods"
      }
    },
    contact: {
      title: "Let's Connect",
      description: "Currently open for freelance projects and full-time opportunities in Frontend Architecture and AI Integration.",
      email: "luismartinez.developer@gmail.com",
      linkedin: "LinkedIn Profile",
      github: "GitHub Profile"
    },
    library: {
      title: "Cyber Archive // Knowledge Base",
      subtitle: "Curated engineering readings, system architecture papers, and 3D graphics research.",
      filterAll: "All Files",
      filterArch: "Systems & Architecture",
      filter3D: "3D & Creative Web",
      filterAI: "Generative AI & LLMs",
      filterUI: "UI & Product Engineering",
      readLink: "Explore Resource",
      statusReading: "Archived & Verified",
      items: [
        {
          id: 0,
          title: "Designing Data-Intensive Applications",
          author: "Martin Kleppmann",
          category: "Systems & Architecture",
          tag: "Distributed Systems, Consistency, Storage Engines",
          year: "Foundational",
          description: "The gold standard for understanding reliability, scalability, and maintainability in high-load data architectures.",
          takeaway: "Mastering storage formats, replication logs, and consensus guarantees when designing distributed services.",
          link: "https://dataintensive.net/"
        },
        {
          id: 1,
          title: "Real-Time Rendering (Fourth Edition)",
          author: "Tomas Akenine-Möller et al.",
          category: "3D & Creative Web",
          tag: "WebGL, Shaders, PBR, Spatial Math",
          year: "Industry Bible",
          description: "Comprehensive mathematical and algorithmic reference for modern real-time computer graphics pipelines.",
          takeaway: "Physically based lighting models, GPU rasterization math, and low-latency post-processing techniques.",
          link: "https://www.realtimerendering.com/"
        },
        {
          id: 2,
          title: "Generative AI Architecture & LLM Agents",
          author: "Vaswani et al. / Research Papers",
          category: "Generative AI & LLMs",
          tag: "Transformers, Attention, Multimodal, Latency",
          year: "Contemporary",
          description: "Curated collection of core papers behind modern transformer architectures, streaming tokenizers, and multimodal context windows.",
          takeaway: "Engineering robust client-server pipelines with low-latency streaming and tool-calling agent loops.",
          link: "https://arxiv.org/abs/1706.03762"
        },
        {
          id: 3,
          title: "Clean Architecture & Frontend Modularity",
          author: "Robert C. Martin / Modern Web Patterns",
          category: "UI & Product Engineering",
          tag: "TypeScript, State Decoupling, Microfrontends",
          year: "Core Craft",
          description: "Separation of concerns between application business logic, persistent data stores, and ephemeral view presentations.",
          takeaway: "Building maintainable, testable UI architectures that scale without coupling framework dependencies.",
          link: "https://blog.cleancoder.com/"
        },
        {
          id: 4,
          title: "Three.js & WebGL Shaders Masterclass",
          author: "Creative Coding Archive",
          category: "3D & Creative Web",
          tag: "GLSL, Vertex Shaders, Post-processing, Math",
          year: "Creative Tech",
          description: "In-depth guide to writing custom GLSL fragment shaders, procedural noise generation, and GPU buffer optimizations.",
          takeaway: "Crafting bespoke visual effects, holographic dispersion, and high-DPR 60 FPS spatial interactive web experiences.",
          link: "https://threejs.org/docs/"
        }
      ]
    },
    labels: {
      home: "HOME",
      projects: "PROJECTS",
      about: "ABOUT / AI",
      library: "LIBRARY // ARCHIVE",
      contact: "CONTACT"
    },
    instructions: {
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
      fetching: "FETCHING DATA...",
      rateLimited: "GitHub's hourly request limit was reached. Live stats will be back shortly.",
      unavailable: "Live GitHub stats are unavailable right now.",
      viewOnGitHub: "View profile on GitHub"
    },
    ambient: {
      label: "Ambient Audio",
      active: "AMBIENT ON",
      muted: "AMBIENT OFF",
      toggleTitle: "Toggle ambient background audio"
    }
  },
  es: {
    home: {
      role: "Ingeniero Creativo Full Stack",
      description: "Construyo productos web rápidos y cuidados, e integro IA generativa en ellos. Disponible para proyectos freelance y puestos a tiempo completo.",
      cta: {
        sound: "Escuchar",
        mute: "Silenciar",
        replay: "Ver de nuevo",

        next: "Siguiente",
        quickView: "Versión rápida",
        fullView: "Vista 3D"
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
      subtitle: "Potenciado por Gemini 3 Flash",
      placeholder: "Pregunta sobre mi experiencia...",
      send: "Enviar",
      initialMessage: "¡Hola! Soy el asistente IA de este portafolio. Pregúntame sobre las habilidades, experiencia o stack tecnológico de Luis.",
      quickQuestions: [
        "¿Qué notas tienes en tus cuadernos de NotebookLM?",
        "Explícame tus notas de Arquitectura de Software",
        "¿Cuál es tu stack tecnológico?",
        "¿Cómo integras Three.js con IA?"
      ],
      knowledgeMode: {
        active: "Modo Conexión NotebookLM",
        inactive: "Modo IA General",
        tooltip: "Alternar consulta fundamentada en los cuadernos de NotebookLM",
        statusActive: "NOTEBOOKLM: ACTIVO // FUNDAMENTADO",
        statusInactive: "MODO IA GENERAL // SIN FUNDAMENTAR",
        badge: "NotebookLM Conectado",
        switchedToActive: "[SISTEMA]: Asistente sincronizado con la Bóveda de Cuadernos de NotebookLM (5 cuadernos activos).",
        switchedToInactive: "[SISTEMA]: Modo IA General activado. Respuestas abiertas sin restringir a los cuadernos.",
        initializing: "INICIALIZANDO CONEXIÓN...",
        initialized: "CONEXIÓN INICIALIZADA // BÓVEDA LISTA",
        podsSynced: "5 Cuadernos Sincronizados",
        floatingTitle: "Modo Base de Conocimiento",
        floatingSubtitle: "Fundamentación NotebookLM",
        openAssistant: "Abrir Asistente Neuronal",
        notebooksListTitle: "Cuadernos Conectados"
      }
    },
    contact: {
      title: "Conectemos",
      description: "Actualmente disponible para proyectos freelance y oportunidades full-time en Arquitectura Frontend e Integración de IA.",
      email: "luismartinez.developer@gmail.com",
      linkedin: "Perfil LinkedIn",
      github: "Perfil GitHub"
    },
    library: {
      title: "Archivo Digital // Base de Conocimiento",
      subtitle: "Lecturas seleccionadas de ingeniería, arquitectura de sistemas e investigación en gráficos 3D.",
      filterAll: "Todos",
      filterArch: "Sistemas y Arquitectura",
      filter3D: "3D y Web Creativa",
      filterAI: "IA Generativa y LLMs",
      filterUI: "UI e Ingeniería de Producto",
      readLink: "Explorar Recurso",
      statusReading: "Archivado y Verificado",
      items: [
        {
          id: 0,
          title: "Designing Data-Intensive Applications",
          author: "Martin Kleppmann",
          category: "Sistemas y Arquitectura",
          tag: "Sistemas Distribuidos, Consistencia, Storage Engines",
          year: "Fundamental",
          description: "La referencia de oro para comprender confiabilidad, escalabilidad y mantenimiento en arquitecturas de datos de alta carga.",
          takeaway: "Dominio de formatos de almacenamiento, replicación y consenso al diseñar servicios distribuidos robustos.",
          link: "https://dataintensive.net/"
        },
        {
          id: 1,
          title: "Real-Time Rendering (Cuarta Edición)",
          author: "Tomas Akenine-Möller et al.",
          category: "3D y Web Creativa",
          tag: "WebGL, Shaders, PBR, Matemáticas Espaciales",
          year: "Biblia de la Industria",
          description: "Manual exhaustivo sobre los algoritmos matemáticos y pipelines modernos de gráficos por computadora en tiempo real.",
          takeaway: "Modelos de iluminación física, rasterización en GPU y técnicas de post-procesamiento de baja latencia.",
          link: "https://www.realtimerendering.com/"
        },
        {
          id: 2,
          title: "Arquitectura de IA Generativa y Agentes LLM",
          author: "Vaswani et al. / Artículos de Investigación",
          category: "IA Generativa y LLMs",
          tag: "Transformers, Atención, Multimodal, Latencia",
          year: "Contemporáneo",
          description: "Compendio de investigaciones clave sobre arquitecturas transformer, tokenización en streaming y ventanas de contexto multimodal.",
          takeaway: "Ingeniería de flujos cliente-servidor resilientes con streaming de baja latencia y bucles de agentes con tool-calling.",
          link: "https://arxiv.org/abs/1706.03762"
        },
        {
          id: 3,
          title: "Clean Architecture y Modularidad en Frontend",
          author: "Robert C. Martin / Patrones Web Modernos",
          category: "UI e Ingeniería de Producto",
          tag: "TypeScript, Desacoplamiento de Estado, Microfrontends",
          year: "Buenas Prácticas",
          description: "Separación estricta entre la lógica de negocio, almacenes de datos y la capa de presentación efímera de la interfaz.",
          takeaway: "Construcción de arquitecturas de interfaz escalables y testables sin acoplar dependencias de frameworks.",
          link: "https://blog.cleancoder.com/"
        },
        {
          id: 4,
          title: "Masterclass de Shaders Three.js y WebGL",
          author: "Archivo de Creative Coding",
          category: "3D y Web Creativa",
          tag: "GLSL, Vertex Shaders, Post-procesamiento, Math",
          year: "Tecnología Creativa",
          description: "Guía práctica para escribir fragment shaders GLSL personalizados, generación de ruido procedural y optimización de buffers.",
          takeaway: "Creación de efectos visuales a medida, dispersión holográfica y experiencias 3D interactivas a 60 FPS con alto DPR.",
          link: "https://threejs.org/docs/"
        }
      ]
    },
    labels: {
      home: "INICIO",
      projects: "PROYECTOS",
      about: "SOBRE MI / IA",
      library: "BIBLIOTECA // ARCHIVO",
      contact: "CONTACTO"
    },
    instructions: {
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
      fetching: "OBTENIENDO DATOS...",
      rateLimited: "Se alcanzó el límite de peticiones por hora de GitHub. Las estadísticas volverán en breve.",
      unavailable: "Las estadísticas de GitHub no están disponibles ahora mismo.",
      viewOnGitHub: "Ver perfil en GitHub"
    },
    ambient: {
      label: "Audio Ambiental",
      active: "AMBIENTE ON",
      muted: "AMBIENTE OFF",
      toggleTitle: "Alternar audio ambiental de fondo"
    }
  },
  zh: {
    home: {
      role: "全栈创意工程师",
      description: "我打造快速、精致的 Web 产品，并将生成式 AI 融入其中。目前接受自由职业项目和全职机会。",
      cta: {
        sound: "播放声音",
        mute: "静音",
        replay: "重新播放",

        next: "下一步",
        quickView: "快速版",
        fullView: "3D 视图"
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
      subtitle: "由 Gemini 3 Flash 驱动",
      placeholder: "询问我的���验...",
      send: "发送",
      initialMessage: "您好！我是这个作品集的 AI 助手。您可以问我关于 Luis 的技能、经验或技术栈的问题。",
      quickQuestions: [
        "你的 NotebookLM 笔记本记录了哪些知识？",
        "介绍一下你在系统架构笔记中的核心要点",
        "你的技术栈是什么？",
        "你如何将 Three.js 与生成式 AI 结合？"
      ],
      knowledgeMode: {
        active: "NotebookLM 知识库模式",
        inactive: "通用 AI 模式",
        tooltip: "切换 NotebookLM 知识库检索增强",
        statusActive: "NOTEBOOKLM: 已连接 // 知识库就绪",
        statusInactive: "通用 AI 模式 // 开放对话",
        badge: "NotebookLM 已同步",
        switchedToActive: "[系统]: 神经助手已连接到 NotebookLM 知识档案（5 本笔记本已就绪）。",
        switchedToInactive: "[系统]: 已切换至通用 AI 模式。回答将基于广泛知识而非特定笔记本。",
        initializing: "正在初始化连接...",
        initialized: "连接已就绪 // 知识档案已同步",
        podsSynced: "已同步 5 本笔记本",
        floatingTitle: "知识库感知模式",
        floatingSubtitle: "NotebookLM 神经检索",
        openAssistant: "打开神经助手",
        notebooksListTitle: "已连接的知识笔记本"
      }
    },
    contact: {
      title: "保持联系",
      description: "目前接受前端架构和 AI 集成方面的兼职项目和全职机会。",
      email: "luismartinez.developer@gmail.com",
      linkedin: "领英主页",
      github: "GitHub 主页"
    },
    library: {
      title: "数字档案 // 知识库",
      subtitle: "精选系统架构论文、3D 图形学研究及前端工程读物。",
      filterAll: "全部文件",
      filterArch: "系统与架构",
      filter3D: "3D 与创意网络",
      filterAI: "生成式 AI 与 LLM",
      filterUI: "UI 与产品工程",
      readLink: "探索资源",
      statusReading: "已归档并验证",
      items: [
        {
          id: 0,
          title: "数据密集型应用系统设计 (DDIA)",
          author: "Martin Kleppmann",
          category: "系统与架构",
          tag: "分布式系统, 一致性, 存储引擎",
          year: "奠基之作",
          description: "理解高负载数据架构中可靠性、可扩展性和可维护性的黄金标准。",
          takeaway: "深入掌握存储格式、复制日志和共识算法以构建稳健的分布式服务。",
          link: "https://dataintensive.net/"
        },
        {
          id: 1,
          title: "实时渲染 (Real-Time Rendering 第四版)",
          author: "Tomas Akenine-Möller 等",
          category: "3D 与创意网络",
          tag: "WebGL, 着色器, PBR, 空间数学",
          year: "行业经典",
          description: "现代实时计算机图形管线数学与算法的权威指南。",
          takeaway: "物理光照模型、GPU 光栅化数学与低延迟后处理技术。",
          link: "https://www.realtimerendering.com/"
        },
        {
          id: 2,
          title: "生成式 AI 架构与大模型智能体",
          author: "Vaswani 等 / 核心研究论文",
          category: "生成式 AI 与 LLM",
          tag: "Transformers, 注意力机制, 多模态, 流式传输",
          year: "当代前沿",
          description: "现代 Transformer 架构、流式分词及多模态长上下文的核心论文集。",
          takeaway: "构建具有低延迟流式响应和工具调用 Agent 循环的高可用客户端-服务器管线。",
          link: "https://arxiv.org/abs/1706.03762"
        },
        {
          id: 3,
          title: "整洁架构与前端模块化 (Clean Architecture)",
          author: "Robert C. Martin / 现代 Web 模式",
          category: "UI 与产品工程",
          tag: "TypeScript, 状态解耦, 微前端",
          year: "工程规范",
          description: "核心业务逻辑、持久化存储与视图层展示之间的清晰解耦。",
          takeaway: "构建无需强绑定特定前端框架的高内聚、可测试的扩展架构。",
          link: "https://blog.cleancoder.com/"
        },
        {
          id: 4,
          title: "Three.js 与 WebGL 着色器精粹",
          author: "创意编程文献库",
          category: "3D 与创意网络",
          tag: "GLSL, 顶点着色器, 后处理, 过程噪声",
          year: "创意科技",
          description: "编写定制 GLSL 片段着色器、过程化噪声生成与 GPU 缓冲优化的实践指南。",
          takeaway: "实现全息色散、空间光效及高 DPI 60 FPS 的流畅沉浸式 3D Web 体验。",
          link: "https://threejs.org/docs/"
        }
      ]
    },
    labels: {
      home: "首页",
      projects: "项目",
      about: "关于 / AI",
      library: "数字档案",
      contact: "联系方式"
    },
    instructions: {
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
      fetching: "获取数据中...",
      rateLimited: "已达到 GitHub 每小时请求上限，实时数据稍后恢复。",
      unavailable: "实时 GitHub 数据暂时无法获取。",
      viewOnGitHub: "在 GitHub 上查看主页"
    },
    ambient: {
      label: "环境音效",
      active: "环境音 开",
      muted: "环境音 关",
      toggleTitle: "切换背景环境音效"
    }
  }
};
