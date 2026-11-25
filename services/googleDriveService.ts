import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

export const DEFAULT_DRIVE_FOLDER_ID = '1PFwiwBIbRUFybkTEc5nbBpuB7rS6FmV1';
export const DEFAULT_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}?usp=drive_link`;

export const DRIVE_SCOPES: readonly string[] = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
];

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export class DriveAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveAuthError';
  }
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of DRIVE_SCOPES) {
  provider.addScope(scope);
}

// Strict in-memory token cache (never stored in localStorage/sessionStorage).
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
};

export const googleDriveSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new DriveAuthError('Failed to obtain Google Drive access token from sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = (): string | null => cachedAccessToken;

export const googleDriveLogout = async (): Promise<void> => {
  cachedAccessToken = null;
  await auth.signOut();
};

export const extractDriveFolderId = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_DRIVE_FOLDER_ID;
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch?.[1]) return folderMatch[1];
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch?.[1]) return idMatch[1];
  return trimmed;
};

const requireToken = (): string => {
  if (!cachedAccessToken) {
    throw new DriveAuthError('AUTH_REQUIRED');
  }
  return cachedAccessToken;
};

const handleDriveResponse = async (res: Response): Promise<Response> => {
  if (res.status === 401) {
    cachedAccessToken = null;
    throw new DriveAuthError('AUTH_EXPIRED');
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Google Drive API error (${res.status}): ${errText || res.statusText}`);
  }
  return res;
};

export const listDriveFolderFiles = async (folderId: string): Promise<DriveFileItem[]> => {
  const token = requireToken();
  const safeId = folderId.replace(/'/g, "\\'");
  const query = `'${safeId}' in parents and trashed = false`;
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink)',
    orderBy: 'folder,name',
    pageSize: '100',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await handleDriveResponse(res);
  const data = (await res.json()) as { files?: DriveFileItem[] };
  return data.files ?? [];
};

export const searchAllGlbInDrive = async (): Promise<DriveFileItem[]> => {
  const token = requireToken();
  const query = `(name contains '.glb' or name contains '.gltf') and trashed = false`;
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink)',
    orderBy: 'modifiedTime desc',
    pageSize: '100',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await handleDriveResponse(res);
  const data = (await res.json()) as { files?: DriveFileItem[] };
  return data.files ?? [];
};

export const downloadDriveFileBuffer = async (fileId: string): Promise<ArrayBuffer> => {
  const token = requireToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  await handleDriveResponse(res);
  return res.arrayBuffer();
};

import { listStoredGlbNames, normalizeGlbFileName, saveGlbBuffer } from '../utils/glbVaultStorage';

export const IS_DEV_MODE = Boolean(
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV
);

export const listLocalImportedModels = async (): Promise<string[]> => {
  const idbModels = await listStoredGlbNames();
  if (!IS_DEV_MODE) return idbModels;
  try {
    const res = await fetch('/__dev/local-models');
    if (!res.ok) return idbModels;
    const data = (await res.json()) as { models?: string[] };
    return Array.from(new Set([...idbModels, ...(data.models ?? [])]));
  } catch {
    return idbModels;
  }
};

export const importDriveFileToProject = async (
  fileId: string,
  fileName: string
): Promise<{ fileName: string; publicPath: string; byteSize: number }> => {
  const safeName = normalizeGlbFileName(fileName);

  if (IS_DEV_MODE) {
    const token = requireToken();
    const res = await fetch('/__dev/import-glb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileId, fileName: safeName }),
    });

    if (res.status === 401) {
      cachedAccessToken = null;
      throw new DriveAuthError('AUTH_EXPIRED');
    }
    const data = (await res.json()) as {
      ok?: boolean;
      fileName?: string;
      publicPath?: string;
      byteSize?: number;
      error?: string;
    };
    if (!res.ok || !data.ok || !data.fileName || !data.publicPath) {
      throw new Error(data.error || `Failed to save ${fileName} (${res.status})`);
    }

    // Mirror into browser IndexedDB so the 3D scene keeps the models across refreshes
    try {
      const localRes = await fetch(`./models/${data.fileName}`);
      if (localRes.ok) {
        const buf = await localRes.arrayBuffer();
        await saveGlbBuffer(data.fileName, buf);
      }
    } catch {
      // Non-fatal: dev /models/ endpoint still serves it
    }

    return {
      fileName: data.fileName,
      publicPath: data.publicPath,
      byteSize: data.byteSize ?? 0,
    };
  }

  // Production / Shared App preview: download directly from Drive and store in browser IndexedDB
  const buffer = await downloadDriveFileBuffer(fileId);
  if (safeName.toLowerCase().endsWith('.glb')) {
    const view = new DataView(buffer);
    if (buffer.byteLength < 12 || view.getUint32(0, true) !== 0x46546c67) {
      throw new Error(`${fileName} is not a valid binary .glb asset`);
    }
  }
  await saveGlbBuffer(safeName, buffer);
  return {
    fileName: safeName,
    publicPath: `./models/${safeName}`,
    byteSize: buffer.byteLength,
  };
};
