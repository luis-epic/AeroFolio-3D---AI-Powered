export type Language = 'en' | 'es' | 'zh';

export interface NotebookEntry {
  id: string;
  title: string;
  category: string;
  tag: string;
  notebookUrl: string;
  sourceBadge: string;
  lastUpdated: string;
  topics: string[];
  summary: Record<Language, string>;
  keyTakeaways: Record<Language, string[]>;
  sampleNotes: Record<Language, string>;
}

/**
 * NOTEBOOK_VAULT: Curated knowledge corpus exported from Luis's Google NotebookLM notebooks.
 * Used for grounding the Neural Assistant (RAG) and rendering interactive study pods in the CyberLibrary.
 */
export const NOTEBOOK_VAULT: NotebookEntry[] = [
  {
    id: 'nb-systems-arch',
    title: 'Software Architecture & Distributed Systems',
    category: 'Systems & Architecture',
    tag: 'Distributed Systems, CQRS, Consistency, Event Sourcing',
    notebookUrl: 'https://notebooklm.google.com/',
    sourceBadge: 'NotebookLM Grounded',
    lastUpdated: '2026.Q1',
    topics: ['Event Sourcing', 'CAP Theorem', 'CQRS', 'Idempotency', 'Consensus Algorithms'],
    summary: {
      en: 'Synthesis on modern distributed systems engineering: trade-offs between strong vs eventual consistency, storage engines (LSM-trees vs B-trees), and fault-tolerant event-driven microservices.',
      es: 'Síntesis sobre ingeniería de sistemas distribuidos modernos: trade-offs entre consistencia fuerte y eventual, motores de almacenamiento (LSM-trees vs B-trees) y microservicios resilientes orientados a eventos.',
      zh: '现代分布式系统工程的深度综述：强一致性与最终一致性的权衡、存储引擎（LSM-tree 与 B-tree）以及基于事件驱动的高容错微服务。',
    },
    keyTakeaways: {
      en: [
        'Idempotency keys and outbox patterns prevent dual-write anomalies across message brokers.',
        'LSM-Trees optimize for high write throughput; B-Trees favor fast deterministic point reads.',
        'Circuit breakers with exponential jittered backoffs protect downstream services under degraded loads.',
      ],
      es: [
        'Las claves de idempotencia y el patrón outbox previenen anomalías de doble escritura en brokers de mensajería.',
        'Los LSM-Trees optimizan el rendimiento de escritura intensiva; los B-Trees favorecen lecturas deterministas rápidas.',
        'Los circuit breakers con backoff exponencial aleatorizado protegen servicios dependientes ante sobrecargas.',
      ],
      zh: [
        '幂等性密钥和发件箱（Outbox）模式可防止消息中继时的双写异常。',
        'LSM 树针对高吞吐写入进行了优化，而 B 树更利于快速的确定性点查询。',
        '带有随机抖动的指数退避熔断器能在服务降级时保护下游依赖。',
      ],
    },
    sampleNotes: {
      en: 'Core design rule: Never rely on distributed two-phase commits across autonomous microservice boundaries. Prefer saga patterns with compensating transactions and asynchronous event journals.',
      es: 'Regla de diseño central: Nunca depender de 2PC (two-phase commit) distribuido entre microservicios autónomos. Es preferible emplear sagas con transacciones compensatorias y diarios de eventos asíncronos.',
      zh: '核心设计准则：避免在跨自主微服务边界时依赖分布式两阶段提交。优先采用 Saga 模式，配合补偿性事务与异步事件日志。',
    },
  },
  {
    id: 'nb-webgl-graphics',
    title: 'Computer Graphics, Three.js & GLSL Shaders',
    category: '3D & Creative Web',
    tag: 'WebGL, Three.js, GLSL, PBR, Framebuffer Optimization',
    notebookUrl: 'https://notebooklm.google.com/',
    sourceBadge: 'NotebookLM Grounded',
    lastUpdated: '2026.Q1',
    topics: ['GLSL Shaders', 'Draw Call Batching', 'PBR Pipeline', 'Hermite Falloffs', 'Spatial Math'],
    summary: {
      en: 'Technical notes on WebGL rendering pipelines: vertex and fragment shader math, procedural noise, instanced mesh rendering to eliminate draw calls, and GPU memory bandwidth management.',
      es: 'Notas técnicas sobre el pipeline de renderizado en WebGL: matemáticas para vertex y fragment shaders, ruido procedural, renderizado instanciado para eliminar draw calls y gestión de ancho de banda en GPU.',
      zh: 'WebGL 渲染管线技术笔记：顶点和片段着色器数学、过程噪声、通过实例化网格消除绘制调用（Draw Calls）以及 GPU 显存带宽管理。',
    },
    keyTakeaways: {
      en: [
        'Draw call minimization: Combine static geometry into unified buffers or InstancedMesh for 60 FPS mobile performance.',
        'Procedural alpha feathering using Hermite smoothstep functions prevents harsh cut seams against dark viewports.',
        'Always dispose GPU geometries, textures, and render targets inside unmount hooks to prevent WebGL context loss.',
      ],
      es: [
        'Minimización de draw calls: Agrupar geometrías estáticas o usar InstancedMesh para sostener 60 FPS en móviles.',
        'El difuminado alfa procedural con funciones Hermite smoothstep elimina costuras de corte duras en fondos oscuros.',
        'Liberar siempre geometrías, texturas y render targets de GPU en hooks de desmontaje para evitar pérdidas de contexto WebGL.',
      ],
      zh: [
        '最小化绘制调用：合并静态几何体或使用 InstancedMesh 以在移动端稳定维持 60 FPS。',
        '使用 Hermite 平滑阶跃函数（smoothstep）进行过程化 Alpha 羽化，消除深色视口上的生硬裁切接缝。',
        '必须在组件卸载时主动释放 GPU 几何体、纹理和渲染目标，以防止 WebGL 上下文丢失。',
      ],
    },
    sampleNotes: {
      en: 'Spatial performance lesson: Texture uploads and shader re-compilations are the primary culprits of frame stutter. Pre-compile shaders during loader phase and use powerPreference: "high-performance".',
      es: 'Lección de rendimiento espacial: La subida de texturas y la recompilación de shaders causan caídas de frames. Pre-compilar shaders en la fase de carga y usar powerPreference: "high-performance".',
      zh: '空间渲染性能经验：纹理上传和着色器重编译是掉帧卡顿的主要元凶。需在加载阶段预编译着色器，并配置 powerPreference: "high-performance"。',
    },
  },
  {
    id: 'nb-genai-agents',
    title: 'Generative AI Architecture & LLM Agents',
    category: 'Generative AI & LLMs',
    tag: 'Transformers, Function Calling, RAG, Streaming, Multi-Agent',
    notebookUrl: 'https://notebooklm.google.com/',
    sourceBadge: 'NotebookLM Grounded',
    lastUpdated: '2026.Q1',
    topics: ['Tool Calling', 'System Instructions', 'Vector Embeddings', 'Streaming Latency', 'Multi-Turn Chat'],
    summary: {
      en: 'Research synthesis on building production LLM applications: structured JSON schema enforcement, zero-shot tool execution, streaming chunk assembly, and multi-tier context grounding.',
      es: 'Síntesis de investigación sobre aplicaciones LLM en producción: validación de esquemas JSON estructurados, ejecución de tools zero-shot, ensamblaje de chunks en streaming y grounding multicapa.',
      zh: '生产级大语言模型应用构建综述：结构化 JSON Schema 约束、零样本工具调用、流式数据块重组与多层次知识上下文挂载（Grounding）。',
    },
    keyTakeaways: {
      en: [
        'Strict schema injection ensures deterministic agent outputs without hallucinated keys.',
        'Stream processing: Render text tokens immediately to reduce Time-To-First-Token (TTFT) perceived latency below 350ms.',
        'Server-authoritative proxying: Never expose Gemini API keys to the browser bundle; proxy requests through secure endpoints.',
      ],
      es: [
        'La inyección estricta de esquemas asegura salidas deterministas sin alucinaciones en claves de datos.',
        'Procesamiento en streaming: Pintar tokens inmediatamente reduce la latencia percibida (TTFT) por debajo de 350ms.',
        'Proxy autorizado en servidor: Jamás exponer API keys en el bundle de cliente; canalizar siempre por endpoints seguros.',
      ],
      zh: [
        '严格的 Schema 模式注入确保智能体输出确定性结构，杜绝字段幻觉。',
        '流式处理：即时渲染文本标记（Token），使感知到的首字生成延迟（TTFT）保持在 350ms 以下。',
        '服务端权威代理：切勿将 Gemini API 密钥泄露到前端资源包中，始终通过安全后端代理通信。',
      ],
    },
    sampleNotes: {
      en: 'Prompting discipline: Structure system prompts with unambiguous roles, concrete few-shot delimiters, and explicit format prohibitions (e.g. avoiding markdown formatting when rendering terminal logs).',
      es: 'Disciplina de prompting: Estructurar instrucciones con roles claros, delimitadores de contexto concretos y prohibiciones explícitas de formato (por ejemplo, evitar markdown si se renderiza texto plano en terminal).',
      zh: '提示工程规范：系统提示词需具备明确角色定义、具体上下文边界与明确格式约束（如在渲染终端纯文本时显式禁止 markdown）。',
    },
  },
  {
    id: 'nb-frontend-architecture',
    title: 'Frontend Architecture & High-Performance UI',
    category: 'UI & Product Engineering',
    tag: 'React, TypeScript, State Decoupling, Core Web Vitals',
    notebookUrl: 'https://notebooklm.google.com/',
    sourceBadge: 'NotebookLM Grounded',
    lastUpdated: '2026.Q1',
    topics: ['Core Web Vitals', 'Layered Rendering', 'State Decoupling', 'TypeScript Strictness', 'Microfrontends'],
    summary: {
      en: 'Architectural compendium on scalable web products: separating business logic from view presenters, zero-pill design systems, smooth layout transitions, and high-frequency event throttling.',
      es: 'Compendio arquitectónico para productos web escalables: separación de lógica de negocio y presentación visual, sistemas de diseño con jerarquía tipográfica, transiciones suaves y throttling de eventos.',
      zh: '高可扩展 Web 产品架构全书：业务逻辑与视图表现层的彻底解耦、无药丸式排版体系、丝滑页面过渡及高频交互事件节流优化。',
    },
    keyTakeaways: {
      en: [
        'Decouple state: Business workflows reside in custom hooks and pure services, leaving components as pure presenters.',
        'Hybrid viewports: Co-executing full-screen WebGL canvases with accessible DOM overlay layers ensures both immersion and screen-reader compliance.',
        'INP & LCP: Defer non-critical Three.js asset bundles so primary DOM copy paints within the first 1.2s.',
      ],
      es: [
        'Desacoplar estado: Los flujos de negocio residen en hooks y servicios puros, dejando los componentes como presentadores limpios.',
        'Viewports híbridos: Co-ejecutar WebGL a pantalla completa con overlays DOM accesibles garantiza inmersión y accesibilidad.',
        'INP y LCP: Diferir paquetes Three.js pesados para que el contenido principal del DOM se pinte en menos de 1.2s.',
      ],
      zh: [
        '解耦状态：业务工作流固化于自定义 Hook 与纯函数服务中，使 UI 组件保持纯粹的呈现职责。',
        '混合视口：全屏 WebGL Canvas 与无障碍 DOM 覆盖层协同运行，兼顾空间沉浸感与屏幕阅读器兼容性。',
        'INP 与 LCP 优化：懒加载非关键 3D 资源包，使首屏核心 DOM 内容在 1.2 秒内完成绘制。',
      ],
    },
    sampleNotes: {
      en: 'Design philosophy: Anti-AI-slop. Avoid generic rounded card grids. Craft intentional typography, micro-interactions, audio haptics, and responsive camera transitions that feel authored by a senior engineer.',
      es: 'Filosofía de diseño: Rechazar la monotonía genérica. Diseñar con tipografía contundente, micro-interacciones, háptica sonora y cinemáticas de cámara con acabado de alta ingeniería.',
      zh: '设计哲学：拒绝千篇一律的通用模板感。打造克制精炼的字体层级、细腻的微交互、环境音效反馈及极具工程质感的相机转场。',
    },
  },
  {
    id: 'nb-code-craft-devops',
    title: 'Clean Code, DevOps & Engineering Philosophy',
    category: 'Engineering & DevOps',
    tag: 'SOLID, CI/CD, Observability, Telemetry, Testing',
    notebookUrl: 'https://notebooklm.google.com/',
    sourceBadge: 'NotebookLM Grounded',
    lastUpdated: '2026.Q1',
    topics: ['SOLID Principles', 'CI/CD Pipelines', 'Structured Logging', 'Graceful Degradation', 'Test Automation'],
    summary: {
      en: 'Field notes on pragmatic engineering leadership: writing code for readers rather than compilers, automated lint/type check pipelines, continuous integration, and graceful runtime fallbacks.',
      es: 'Notas de campo sobre liderazgo de ingeniería pragmático: escribir código pensando en quien lo lee, pipelines automatizados de lint y tipado, integración continua y fallbacks elegantes en tiempo de ejecución.',
      zh: '务实工程领导力实战笔记：以代码可读性为先、自动化类型检查与代码规范流水线、持续集成及运行时的优雅降级保障。',
    },
    keyTakeaways: {
      en: [
        'Make illegal states unrepresentable: Leverage TypeScript algebraic types and discriminated unions to eliminate runtime null checks.',
        'Graceful degradation: When WebGL or external APIs are unavailable, seamlessly fallback to crisp CSS overlays or cached knowledge.',
        'Automation over vigilance: Enforce architectural constraints through automated lint rules rather than human code review policing.',
      ],
      es: [
        'Hacer que los estados inválidos sean imposibles: Usar tipos algebraicos de TypeScript y uniones discriminadas para eliminar checks nulos.',
        'Degradación elegante: Si WebGL o las APIs externas no están disponibles, cambiar sin fricción a overlays CSS o conocimiento en caché.',
        'Automatización sobre vigilancia: Garantizar restricciones de arquitectura mediante reglas de linter automatizadas en vez de revisión manual.',
      ],
      zh: [
        '消除非法状态表示：充分利用 TypeScript 代数数据类型和可辨识联合（Discriminated Unions）消除运行时空指针隐患。',
        '优雅降级：在 WebGL 或外部 API 不可用时，丝滑回退至高质量 CSS 静态视图或本地知识快照。',
        '自动化重于人工盯防：通过自动化的 Linter 规则强制实施架构契约，而非依赖人工审查纠错。',
      ],
    },
    sampleNotes: {
      en: 'Core engineering motto: Complexity is the enemy of reliability. The best code is the code you did not have to write because the architecture naturally prevented the problem.',
      es: 'Lema de ingeniería: La complejidad es el enemigo de la confiabilidad. El mejor código es aquel que no tuviste que escribir porque la arquitectura resolvió el problema de forma natural.',
      zh: '核心工程信条：复杂度是可靠性的最大敌人。最优雅的代码是无需编写的代码——因为良好的架构天然规避了问题的产生。',
    },
  },
];

/**
 * Searches the NotebookLM Knowledge Vault and synthesizes an authoritative grounded response.
 * Used as an instant local intelligence engine and fallback when external API connections are unavailable.
 */
export function queryKnowledgeVault(query: string, language: Language = 'es'): string | null {
  const q = query.toLowerCase().trim();
  const tokens = q.split(/[\s,?.!¿¡;:]+/).filter((w) => w.length > 2);

  let bestMatch: NotebookEntry | null = null;
  let highestScore = 0;

  for (const nb of NOTEBOOK_VAULT) {
    let score = 0;
    const searchable = `${nb.title} ${nb.category} ${nb.tag} ${nb.topics.join(' ')}`.toLowerCase();

    for (const t of tokens) {
      if (searchable.includes(t)) score += 3;
    }

    if (q.includes('three') || q.includes('shader') || q.includes('webgl') || q.includes('3d') || q.includes('grafic')) {
      if (nb.id === 'nb-webgl-graphics') score += 10;
    }
    if (q.includes('arquitectura') || q.includes('sistema') || q.includes('distribu') || q.includes('microservicio') || q.includes('cqrs')) {
      if (nb.id === 'nb-systems-arch') score += 10;
    }
    if (q.includes('ai') || q.includes('ia') || q.includes('llm') || q.includes('agente') || q.includes('agent') || q.includes('prompt')) {
      if (nb.id === 'nb-genai-agents') score += 10;
    }
    if (q.includes('frontend') || q.includes('react') || q.includes('ui') || q.includes('vitals') || q.includes('rendimiento')) {
      if (nb.id === 'nb-frontend-architecture') score += 10;
    }
    if (q.includes('clean') || q.includes('solid') || q.includes('devops') || q.includes('codigo') || q.includes('filosof')) {
      if (nb.id === 'nb-code-craft-devops') score += 10;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = nb;
    }
  }

  const matched =
    (highestScore > 0 ? bestMatch : null) ||
    (q.includes('notebook') || q.includes('cuaderno') || q.includes('apunte') || q.includes('nota')
      ? NOTEBOOK_VAULT[0]
      : null);

  if (!matched) return null;

  const summary = matched.summary[language] || matched.summary.en;
  const takeaways = matched.keyTakeaways[language] || matched.keyTakeaways.en;
  const sampleNote = matched.sampleNotes[language] || matched.sampleNotes.en;

  if (language === 'es') {
    return `Según los cuadernos de NotebookLM de Luis [Cuaderno: ${matched.title}]:

${summary}

Puntos clave de ingeniería:
• ${takeaways[0]}
• ${takeaways[1]}
• ${takeaways[2]}

Nota destacada del autor:
"${sampleNote}"

Puedes consultar todos los cuadernos interactivos en la sección de Biblioteca / Archivo Digital.`;
  }

  if (language === 'zh') {
    return `根据 Luis 的 NotebookLM 知识档案 [笔记本: ${matched.title}]：

${summary}

核心工程要点：
• ${takeaways[0]}
• ${takeaways[1]}
• ${takeaways[2]}

作者重点笔记：
"${sampleNote}"

您可以在本站的“数字档案 / 知识库”中浏览完整的笔记条目与资源。`;
  }

  return `According to Luis's NotebookLM knowledge corpus [Notebook: ${matched.title}]:

${summary}

Core engineering takeaways:
• ${takeaways[0]}
• ${takeaways[1]}
• ${takeaways[2]}

Author's highlighted note:
"${sampleNote}"

You can explore all interactive notebooks directly in the Library / Digital Archive section.`;
}
