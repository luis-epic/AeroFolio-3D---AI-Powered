import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { User } from 'firebase/auth';
import {
  Box,
  Check,
  Copy,
  Download,
  FolderOpen,
  HardDrive,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  DEFAULT_DRIVE_FOLDER_URL,
  DriveAuthError,
  type DriveFileItem,
  downloadDriveFileBuffer,
  extractDriveFolderId,
  getDriveAccessToken,
  googleDriveLogout,
  googleDriveSignIn,
  importDriveFileToProject,
  initDriveAuth,
  listDriveFolderFiles,
  listLocalImportedModels,
  searchAllGlbInDrive,
} from '../../services/googleDriveService';
import {
  analyzeGlbArrayBuffer,
  disposeThreeObject,
  type GlbAnalysisReport,
} from '../../utils/glbAnalyzer';
import { playClickSound, playHoverSound } from '../../utils/soundEngine';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

const isGlbOrGltf = (name: string): boolean => /\.(glb|gltf)$/i.test(name);
const isDeferredHeavyModel = (name: string): boolean => /bttf|delorean/i.test(name);

const formatBytes = (bytesStr?: string | number): string => {
  const bytes = typeof bytesStr === 'number' ? bytesStr : Number(bytesStr ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const MiniGlbPreview: React.FC<{ sceneObject: THREE.Group | null }> = ({ sceneObject }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sceneObject) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 220;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const previewScene = new THREE.Scene();
    const ambient = new THREE.AmbientLight('#c7d2fe', 1.1);
    const keyLight = new THREE.DirectionalLight('#38bdf8', 2.2);
    keyLight.position.set(4, 6, 5);
    const rimLight = new THREE.DirectionalLight('#f472b6', 1.4);
    rimLight.position.set(-4, 3, -4);
    previewScene.add(ambient, keyLight, rimLight);

    const cloned = sceneObject.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    const targetScale = 2.4 / maxAxis;
    cloned.scale.multiplyScalar(targetScale);
    cloned.position.set(
      -center.x * targetScale,
      -center.y * targetScale,
      -center.z * targetScale
    );
    previewScene.add(cloned);

    const grid = new THREE.GridHelper(4, 12, '#06b6d4', '#1e293b');
    grid.position.y = -(size.y * targetScale) / 2;
    previewScene.add(grid);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 100);
    camera.position.set(2.6, 1.8, 3.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.6;
    controls.target.set(0, 0, 0);

    let raf = 0;
    const renderLoop = () => {
      raf = requestAnimationFrame(renderLoop);
      controls.update();
      renderer.render(previewScene, camera);
    };
    renderLoop();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 320;
      const h = container.clientHeight || 220;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(raf);
      controls.dispose();
      renderer.dispose();
      grid.geometry.dispose();
      if (Array.isArray(grid.material)) grid.material.forEach((m) => m.dispose());
      else grid.material.dispose();
    };
  }, [sceneObject]);

  return (
    <div
      ref={containerRef}
      className="w-full h-56 rounded-lg border border-cyan-500/25 bg-black/70 overflow-hidden"
    />
  );
};

export const DriveGlbVault: React.FC = () => {
  const { language } = useLanguage();
  const [needsAuth, setNeedsAuth] = useState<boolean>(() => !getDriveAccessToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [folderInput, setFolderInput] = useState(DEFAULT_DRIVE_FOLDER_URL);
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [reports, setReports] = useState<Record<string, GlbAnalysisReport>>({});
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const previewScenesRef = useRef<Record<string, THREE.Group>>({});
  const objectUrlsRef = useRef<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = {
    title:
      language === 'es'
        ? 'Explorador Google Drive (.glb)'
        : language === 'zh'
        ? 'Google Drive 3D 模型检查器'
        : 'Google Drive 3D (.glb) Inspector',
    authPrompt:
      language === 'es'
        ? 'Inicia sesión con Google para listar, analizar y guardar los modelos .glb en el proyecto.'
        : language === 'zh'
        ? '使用 Google 登录以在浏览器内存中读取、分析并导入云端硬碟中的 .glb 模型。'
        : 'Sign in with Google to browse, analyze, and import .glb 3D models into this project.',
    signInLabel: 'Sign in with Google',
    loadFolder:
      language === 'es' ? 'Abrir carpeta' : language === 'zh' ? '加载文件夹' : 'Load folder',
    findAll:
      language === 'es' ? 'Buscar todos los .glb' : language === 'zh' ? '搜索所有 .glb' : 'Find all .glb',
    analyze:
      language === 'es' ? 'Analizar .glb' : language === 'zh' ? '分析模型' : 'Analyze .glb',
    analyzing:
      language === 'es' ? 'Analizando...' : language === 'zh' ? '分析中...' : 'Analyzing...',
    saveToProject:
      language === 'es' ? 'Agregar al proyecto' : language === 'zh' ? '导入项目' : 'Add to project',
    saving:
      language === 'es' ? 'Guardando...' : language === 'zh' ? '保存中...' : 'Saving...',
    savedBadge:
      language === 'es' ? 'Guardado en caché 3D' : language === 'zh' ? '已保存至 3D 缓存' : 'Saved in 3D cache',
    saveAll:
      language === 'es'
        ? 'Importar modelos del estudio (sin DeLorean)'
        : language === 'zh'
        ? '导入工作室模型（不含 DeLorean）'
        : 'Import studio models (excl. DeLorean)',
    emptyFolder:
      language === 'es'
        ? 'No se encontraron archivos en esta carpeta (o verifica permisos de acceso).'
        : language === 'zh'
        ? '此文件夹中未找到文件。'
        : 'No files found in this folder.',
    copySpec:
      language === 'es' ? 'Copiar reporte JSON' : language === 'zh' ? '复制 JSON 报告' : 'Copy JSON report',
    copied:
      language === 'es' ? 'Copiado' : language === 'zh' ? '已复制' : 'Copied',
    signOut:
      language === 'es' ? 'Desconectar' : language === 'zh' ? '退出登录' : 'Sign out',
  };

  const refreshLocalModels = useCallback(async () => {
    const existing = await listLocalImportedModels();
    setLocalModels(existing);
  }, []);

  const loadFolder = useCallback(
    async (folderIdOrUrl: string) => {
      setLoadingFiles(true);
      setErrorMsg(null);
      try {
        const folderId = extractDriveFolderId(folderIdOrUrl);
        const [list] = await Promise.all([
          listDriveFolderFiles(folderId),
          refreshLocalModels(),
        ]);
        setFiles(list);
      } catch (err) {
        if (err instanceof DriveAuthError) {
          setNeedsAuth(true);
        } else {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to list Drive folder');
        }
      } finally {
        setLoadingFiles(false);
      }
    },
    [refreshLocalModels]
  );

  useEffect(() => {
    const scenesMap = previewScenesRef.current;
    const urlsList = objectUrlsRef.current;
    const unsubscribe = initDriveAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => {
      unsubscribe();
      Object.values(scenesMap).forEach(disposeThreeObject);
      urlsList.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    refreshLocalModels();
  }, [refreshLocalModels]);

  useEffect(() => {
    if (!needsAuth && files.length === 0 && !loadingFiles) {
      loadFolder(DEFAULT_DRIVE_FOLDER_URL);
    }
  }, [needsAuth, files.length, loadingFiles, loadFolder]);

  const handleFindAllGlb = async () => {
    playClickSound();
    setLoadingFiles(true);
    setErrorMsg(null);
    try {
      const [list] = await Promise.all([searchAllGlbInDrive(), refreshLocalModels()]);
      setFiles(list);
    } catch (err) {
      if (err instanceof DriveAuthError) {
        setNeedsAuth(true);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to search Drive');
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleLogin = async () => {
    playClickSound();
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const res = await googleDriveSignIn();
      if (res) {
        setUser(res.user);
        setNeedsAuth(false);
        await loadFolder(folderInput);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    playClickSound();
    await googleDriveLogout();
    setFiles([]);
    setNeedsAuth(true);
  };

  const handleAnalyzeFile = async (file: DriveFileItem) => {
    playClickSound();
    if (reports[file.id]) {
      setActivePreviewId(file.id);
      return;
    }
    setAnalyzingId(file.id);
    setErrorMsg(null);
    try {
      const buffer = await downloadDriveFileBuffer(file.id);
      const { report, scene } = await analyzeGlbArrayBuffer(file.id, file.name, buffer);
      previewScenesRef.current[file.id] = scene;
      objectUrlsRef.current.push(report.objectUrl);
      setReports((prev) => ({ ...prev, [file.id]: report }));
      setActivePreviewId(file.id);
    } catch (err) {
      if (err instanceof DriveAuthError) {
        setNeedsAuth(true);
      } else {
        setErrorMsg(err instanceof Error ? err.message : `Failed to inspect ${file.name}`);
      }
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleImportFile = async (file: DriveFileItem) => {
    playClickSound();
    setSavingId(file.id);
    setErrorMsg(null);
    try {
      await importDriveFileToProject(file.id, file.name);
      await refreshLocalModels();
      window.dispatchEvent(new CustomEvent('glb-models-updated'));
    } catch (err) {
      if (err instanceof DriveAuthError) {
        setNeedsAuth(true);
      } else {
        setErrorMsg(err instanceof Error ? err.message : `Failed to import ${file.name}`);
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleImportAllGlb = async () => {
    playClickSound();
    const glbFiles = files.filter((f) => isGlbOrGltf(f.name) && !isDeferredHeavyModel(f.name));
    if (glbFiles.length === 0) return;

    setSavingAll(true);
    setErrorMsg(null);
    try {
      for (const file of glbFiles) {
        setSavingId(file.id);
        await importDriveFileToProject(file.id, file.name);
      }
      await refreshLocalModels();
      window.dispatchEvent(new CustomEvent('glb-models-updated'));
    } catch (err) {
      if (err instanceof DriveAuthError) {
        setNeedsAuth(true);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Batch import failed');
      }
    } finally {
      setSavingId(null);
      setSavingAll(false);
    }
  };

  const handleCopyJson = async (report: GlbAnalysisReport) => {
    playClickSound();
    const cleanSpec = { ...report, objectUrl: undefined };
    await navigator.clipboard.writeText(JSON.stringify(cleanSpec, null, 2));
    setCopiedId(report.fileId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (needsAuth) {
    return (
      <div className="rounded-xl border border-cyan-500/25 bg-black/50 p-6 md:p-8 flex flex-col items-center text-center gap-5">
        <div className="h-12 w-12 rounded-xl border border-cyan-400/30 bg-cyan-500/10 flex items-center justify-center text-cyan-300">
          <HardDrive className="w-6 h-6" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-lg font-bold text-white font-sans">{copy.title}</h3>
          <p className="text-sm text-gray-300 leading-relaxed">{copy.authPrompt}</p>
          <p className="text-[11px] font-mono text-cyan-400/80 break-all">
            Folder ID: {extractDriveFolderId(folderInput)}
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-xs font-mono text-rose-300 bg-rose-950/40 border border-rose-500/30 px-3 py-2 rounded-lg max-w-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="gsi-material-button inline-flex items-center gap-3 rounded-full bg-white hover:bg-gray-100 text-[#1f1f1f] px-5 py-2.5 text-sm font-medium shadow-md transition-colors disabled:opacity-60 cursor-pointer"
        >
          <div className="gsi-material-button-icon w-5 h-5 shrink-0">
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              style={{ display: 'block', width: '20px', height: '20px' }}
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          </div>
          <span className="gsi-material-button-contents">
            {isLoggingIn ? '...' : copy.signInLabel}
          </span>
        </button>
      </div>
    );
  }

  const activeReport = activePreviewId ? reports[activePreviewId] : null;
  const activeScene = activePreviewId ? previewScenesRef.current[activePreviewId] ?? null : null;
  const glbCount = files.filter((f) => isGlbOrGltf(f.name) && !isDeferredHeavyModel(f.name)).length;

  return (
    <div className="space-y-4">
      {/* Connected account + Folder controls */}
      <div className="rounded-xl border border-white/10 bg-black/45 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <span className="text-emerald-300">
            {user?.email || user?.displayName || 'Google Drive'}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            onMouseEnter={playHoverSound}
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{copy.signOut}</span>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            playClickSound();
            loadFolder(folderInput);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            aria-label="Google Drive Folder URL or ID"
            className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loadingFiles}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
              <span>{copy.loadFolder}</span>
            </button>
            <button
              type="button"
              onClick={handleFindAllGlb}
              disabled={loadingFiles}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 font-mono text-xs transition-colors whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{copy.findAll}</span>
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {folderHistory.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                const prev = folderHistory[folderHistory.length - 1];
                setFolderHistory((h) => h.slice(0, -1));
                setFolderInput(prev);
                loadFolder(prev);
              }}
              className="text-xs font-mono text-cyan-300 hover:underline"
            >
              ← Back
            </button>
          ) : (
            <span className="text-[11px] font-mono text-gray-400">
              {language === 'es' ? 'Modelos en caché 3D' : 'Cached 3D models'}: {localModels.length}
            </span>
          )}

          {glbCount > 0 && (
            <button
              type="button"
              onClick={handleImportAllGlb}
              disabled={savingAll || savingId !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black font-mono text-xs font-bold transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {savingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>
                {copy.saveAll} ({glbCount})
              </span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10">
          {[
            { file: 'library_low_poly.glb', label: language === 'es' ? 'Librería (Sala)' : 'Library Room' },
            { file: 'hologram_projector_with_hologram.glb', label: language === 'es' ? 'Proyector Holo' : 'Holo Projector' },
            { file: 'laptop_and_mouse.glb', label: 'Laptop + Mouse' },
            { file: 'iphone_15_pro_max_made_in_blender.glb', label: 'iPhone 15 Pro' },
          ].map((slot) => {
            const active = localModels.includes(slot.file);
            return (
              <div
                key={slot.file}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${
                  active
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 bg-white/[0.02] text-gray-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    active ? 'bg-emerald-400' : 'bg-gray-500'
                  }`}
                />
                <span className="truncate">{slot.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs font-mono text-rose-300 bg-rose-950/40 border border-rose-500/30 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active 3D Inspector Panel */}
      {activeReport && (
        <div className="rounded-xl border border-cyan-400/35 bg-cyan-950/15 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <Box className="w-4 h-4 text-cyan-400" />
                {activeReport.fileName}
              </h4>
              <p className="text-xs font-mono text-cyan-300/80 mt-0.5">
                {activeReport.guessedRole} · {formatBytes(activeReport.byteSize)} ·{' '}
                {activeReport.recommendedScaleNote}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyJson(activeReport)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white border border-white/15 transition-colors"
            >
              {copiedId === activeReport.fileId ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedId === activeReport.fileId ? copy.copied : copy.copySpec}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <MiniGlbPreview sceneObject={activeScene} />
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/10">
                <div className="text-gray-400 text-[10px] uppercase">Triangles</div>
                <div className="text-white font-bold tabular-nums">
                  {activeReport.triangleCount.toLocaleString()}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/10">
                <div className="text-gray-400 text-[10px] uppercase">Meshes / Nodes</div>
                <div className="text-white font-bold tabular-nums">
                  {activeReport.meshCount} / {activeReport.nodeCount}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/10">
                <div className="text-gray-400 text-[10px] uppercase">Size (W × H × D)</div>
                <div className="text-white font-bold tabular-nums">
                  {activeReport.dimensions.width} × {activeReport.dimensions.height} ×{' '}
                  {activeReport.dimensions.depth}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/10">
                <div className="text-gray-400 text-[10px] uppercase">Materials / Textures</div>
                <div className="text-white font-bold tabular-nums">
                  {activeReport.materialCount} / {activeReport.textureCount}
                </div>
              </div>
              <div className="col-span-2 p-2.5 rounded-lg bg-black/50 border border-white/10 space-y-1">
                <div className="text-gray-400 text-[10px] uppercase">Top Nodes</div>
                <div className="text-cyan-200 truncate">
                  {activeReport.topLevelNodes.join(' · ') || '—'}
                </div>
              </div>
              <div className="col-span-2 p-2.5 rounded-lg bg-black/50 border border-white/10 space-y-1">
                <div className="text-gray-400 text-[10px] uppercase">
                  Materials ({activeReport.materials.length}) · Animations ({activeReport.animationCount})
                </div>
                <div className="text-gray-200 truncate">
                  {activeReport.materials.map((m) => m.name).join(', ') || 'None'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drive File List */}
      <div className="space-y-2">
        {loadingFiles && (
          <div className="flex items-center justify-center py-8 gap-2 text-xs font-mono text-cyan-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading Google Drive...</span>
          </div>
        )}

        {!loadingFiles && files.length === 0 && (
          <div className="text-center py-8 text-xs font-mono text-gray-400 border border-dashed border-white/10 rounded-xl">
            {copy.emptyFolder}
          </div>
        )}

        {!loadingFiles &&
          files.map((file) => {
            const isFolder = file.mimeType === FOLDER_MIME;
            const isGlb = isGlbOrGltf(file.name);
            const isAnalyzing = analyzingId === file.id;
            const isSaving = savingId === file.id;
            const safeLocalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const isSavedLocally = localModels.includes(safeLocalName);
            const analyzed = reports[file.id];

            return (
              <div
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:border-cyan-400/35 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isFolder ? (
                    <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : isGlb ? (
                    <Box className="w-4 h-4 text-cyan-400 shrink-0" />
                  ) : (
                    <Layers className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-[11px] font-mono text-gray-400">
                      {isFolder ? 'Folder' : formatBytes(file.size)}
                      {analyzed
                        ? ` · ${analyzed.triangleCount.toLocaleString()} tris · ${analyzed.dimensions.width}×${analyzed.dimensions.height}×${analyzed.dimensions.depth}`
                        : ''}
                      {isSavedLocally ? ` · ${copy.savedBadge}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isFolder && (
                    <button
                      type="button"
                      onClick={() => {
                        setFolderHistory((h) => [...h, folderInput]);
                        setFolderInput(file.id);
                        loadFolder(file.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors"
                    >
                      Open
                    </button>
                  )}

                  {isGlb && (
                    <button
                      type="button"
                      onClick={() => handleImportFile(file)}
                      disabled={isSaving || savingAll}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors disabled:opacity-60 whitespace-nowrap ${
                        isSavedLocally
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 hover:bg-emerald-500/30'
                          : 'bg-emerald-400 hover:bg-emerald-300 text-black'
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isSavedLocally ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>{isSaving ? copy.saving : copy.saveToProject}</span>
                    </button>
                  )}

                  {isGlb && (
                    <button
                      type="button"
                      onClick={() => handleAnalyzeFile(file)}
                      disabled={isAnalyzing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-mono font-bold transition-colors disabled:opacity-60 whitespace-nowrap"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Box className="w-3.5 h-3.5" />
                      )}
                      <span>{isAnalyzing ? copy.analyzing : copy.analyze}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default DriveGlbVault;
