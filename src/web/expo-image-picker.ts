// Web shim for expo-image-picker.
// Mirrors the tiny slice of the API that PSA uses:
//   requestMediaLibraryPermissionsAsync → resolves granted
//   launchImageLibraryAsync                → opens a <input type=file> and
//                                          returns {canceled, assets:[...]}
// Mirrors the options/shape used by BaselineScanScreen + EvidenceTrackerScreen.

import { Platform } from 'react-native';

type MediaType = 'Images' | 'Videos' | 'All';

interface ImageInfo {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  type?: string;
}

interface Options {
  mediaTypes?: MediaType;
  allowsEditing?: boolean;
  quality?: number;
  base64?: boolean;
  aspect?: [number, number];
}

interface Result {
  canceled: boolean;
  assets?: ImageInfo[];
}

let lastInput: HTMLInputElement | null = null;

function pickWithInput(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      if (lastInput && lastInput.parentNode) lastInput.parentNode.removeChild(lastInput);
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.position = 'fixed';
      input.style.top = '-1000px';
      input.style.opacity = '0';
      document.body.appendChild(input);
      lastInput = input;
      const done = (file: File | null) => {
        try { if (input.parentNode) input.parentNode.removeChild(input); } catch { /* noop */ }
        if (lastInput === input) lastInput = null;
        resolve(file);
      };
      input.addEventListener('change', () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        done(file);
      });
      // If the user cancels the picker, focus fires when the dialog closes.
      window.addEventListener(
        'focus',
        () => setTimeout(() => { if (lastInput === input && !input.files?.length) done(null); }, 300),
        { once: true },
      );
      input.click();
    } catch {
      resolve(null);
    }
  });
}

function fileToImageInfo(file: File): Promise<ImageInfo> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        uri: url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        fileName: file.name,
        type: file.type || 'image/jpeg',
      });
    };
    img.onerror = () => resolve({ uri: url, fileName: file.name, type: file.type });
    img.src = url;
  });
}

export async function requestMediaLibraryPermissionsAsync(): Promise<{ status: 'granted' | 'denied'; granted: boolean }> {
  if (Platform.OS !== 'web') return { status: 'denied', granted: false };
  return { status: 'granted', granted: true };
}

export async function requestCameraPermissionsAsync(): Promise<{ status: 'granted' | 'denied'; granted: boolean }> {
  return { status: 'denied', granted: false };
}

export async function launchImageLibraryAsync(options?: Options): Promise<Result> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return { canceled: true };
  }
  const accept = options?.mediaTypes === 'Videos' ? 'video/*' : options?.mediaTypes === 'All' ? '*/*' : 'image/*';
  const file = await pickWithInput(accept);
  if (!file) return { canceled: true };
  const info = await fileToImageInfo(file);
  return { canceled: false, assets: [info] };
}

export const MediaTypeOptions = {
  Images: 'Images' as MediaType,
  Videos: 'Videos' as MediaType,
  All: 'All' as MediaType,
};
