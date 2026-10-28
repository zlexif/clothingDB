'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Gender } from '../../lib/clothing';

export const PEDS_BASE = import.meta.env?.WAKU_PUBLIC_PEDS_BASE ?? '/peds';

export interface SlotPick {
  drawable: number;
  texture: number;
}

export interface PedManifest {
  model: string;
  bones: string[];
  slots: Record<string, { slug: string; component: number; drawables: number[] }>;
}

export type StudioBackdrop = 'transparent' | 'green' | 'magenta' | 'studio';
export type Framing = 'full' | 'upper' | 'lower' | 'feet' | 'head';

const FRAMES: Record<Framing, [from: number, to: number]> = {
  full: [0, 1],
  upper: [0.45, 0.92],
  lower: [0.02, 0.55],
  feet: [0, 0.16],
  head: [0.84, 1],
};

const BACKDROP: Record<Exclude<StudioBackdrop, 'transparent'>, number> = {
  green: 0x00ff00,
  magenta: 0xff00ff,
  studio: 0x1a1a1a,
};

export const slotUrl = (gender: Gender, slug: string, p: SlotPick) => `${PEDS_BASE}/${gender}/${slug}/${p.drawable}`;

export interface PedViewportHandle {
  capture: (size: number, type?: string) => Promise<Blob>;
  ready: () => Promise<void>;
  has: (slug: string) => boolean;
  paint: (slug: string, overlay: OverlayPaint) => Promise<boolean>;
}

export interface OverlayPaint {
  url: string;
  mode: 'tint' | 'flat' | 'color' | 'detail';
  color?: [number, number, number];
}

export function PedViewport({
  gender,
  outfit,
  backdrop,
  framing,
  yaw,
  focus = null,
  onReady,
  className,
}: {
  gender: Gender;
  outfit: Record<string, SlotPick | null>;
  backdrop: StudioBackdrop;
  framing: Framing;
  yaw: number;
  focus?: string | null;
  onReady?: (h: PedViewportHandle) => void;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    ped: THREE.Group;
    slots: Map<string, { key: string; obj: THREE.Object3D }>;
    pending: Set<Promise<void>>;
    orbit: { yaw: number; pitch: number; zoom: number };
    frame: () => void;
    render: () => void;
    painted?: THREE.CanvasTexture;
  } | null>(null);

  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.className = 'block h-full w-full touch-none';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(1.5, 2.5, 3);
    const rim = new THREE.DirectionalLight(0xffffff, 1.2);
    rim.position.set(-2, 2, -3);
    scene.add(key, rim);

    const ped = new THREE.Group();
    scene.add(ped);

    const orbit = { yaw: 0, pitch: 0.05, zoom: 1 };
    const box = new THREE.Box3();
    const frame = () => {
      const focusObj = mount.dataset.focus ? stateRef.current?.slots.get(mount.dataset.focus)?.obj : null;
      box.setFromObject(focusObj ?? ped);
      if (box.isEmpty()) return;
      const h = box.max.y - box.min.y;
      const [a, b] = focusObj ? [-0.04, 1.04] : FRAMES[(mount.dataset.framing as Framing) || 'full'];
      const lo = box.min.y + h * a;
      const hi = box.min.y + h * b;
      const cy = (lo + hi) / 2;
      const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
      const span = Math.max(hi - lo, focusObj ? w * 1.08 : 0) * 1.12 * orbit.zoom;
      const dist = span / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const cx = (box.min.x + box.max.x) / 2;
      const cz = (box.min.z + box.max.z) / 2;
      camera.position.set(
        cx + dist * Math.sin(orbit.yaw) * Math.cos(orbit.pitch),
        cy + dist * Math.sin(orbit.pitch),
        cz + dist * Math.cos(orbit.yaw) * Math.cos(orbit.pitch),
      );
      camera.lookAt(cx, cy, cz);
    };
    const render = () => {
      frame();
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let drag: { x: number; y: number } | null = null;
    const el = renderer.domElement;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      orbit.yaw -= (e.clientX - drag.x) * 0.01;
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + (e.clientY - drag.y) * 0.006, -0.6, 0.9);
      drag = { x: e.clientX, y: e.clientY };
      render();
    };
    const up = () => (drag = null);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      orbit.zoom = THREE.MathUtils.clamp(orbit.zoom * (1 + e.deltaY * 0.001), 0.4, 2.5);
      render();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });

    stateRef.current = {
      renderer,
      scene,
      camera,
      ped,
      slots: new Map(),
      pending: new Set(),
      orbit,
      frame,
      render,
    };

    onReady?.({
      capture: async (size, type = 'image/png') => {
        const s = stateRef.current!;
        await Promise.all([...s.pending]);
        const prev = new THREE.Vector2();
        renderer.getSize(prev);
        const prevAspect = camera.aspect;
        renderer.setPixelRatio(1);
        renderer.setSize(size, size, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        render();
        const blob = await new Promise<Blob>((res, rej) =>
          renderer.domElement.toBlob((b) => (b ? res(b) : rej(new Error('capture failed'))), type, 0.92),
        );
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(prev.x, prev.y, false);
        camera.aspect = prevAspect;
        camera.updateProjectionMatrix();
        render();
        return blob;
      },
      ready: async () => {
        await Promise.all([...stateRef.current!.pending]);
      },
      paint: async (slug, overlay) => {
        const st = stateRef.current!;
        const obj = st.slots.get(slug)?.obj;
        let base: CanvasImageSource | null = null;
        obj?.traverse((o) => {
          const map = ((o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined)?.map;
          if (!base && map?.image) base = map.image as CanvasImageSource;
        });
        if (!obj || !base) return false;
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.crossOrigin = 'anonymous';
          i.onload = () => res(i);
          i.onerror = () => rej(new Error(`overlay failed: ${overlay.url}`));
          i.src = overlay.url;
        });
        const b = base as HTMLImageElement;
        const w = b.naturalWidth || b.width;
        const h = b.naturalHeight || b.height;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(b, 0, 0, w, h);

        const layer = document.createElement('canvas');
        layer.width = w;
        layer.height = h;
        const lctx = layer.getContext('2d')!;
        lctx.drawImage(img, 0, 0, w, h);
        if (overlay.mode === 'tint' || overlay.mode === 'flat') {
          const flat = overlay.mode === 'flat';
          const data = lctx.getImageData(0, 0, w, h);
          const [r, g, bl] = overlay.color ?? [40, 28, 20];
          for (let i = 0; i < data.data.length; i += 4) {
            const k = flat ? 1 : data.data[i + 1] / 255;
            data.data[i] = r * k;
            data.data[i + 1] = g * k;
            data.data[i + 2] = bl * k;
          }
          lctx.putImageData(data, 0, 0);
        }
        ctx.globalCompositeOperation = overlay.mode === 'detail' ? 'overlay' : 'source-over';
        ctx.drawImage(layer, 0, 0);

        st.painted?.dispose();
        const tex = new THREE.CanvasTexture(canvas);
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        st.painted = tex;
        obj.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            const mat = m.material as THREE.MeshStandardMaterial;
            mat.map = tex;
            mat.needsUpdate = true;
          }
        });
        st.render();
        return true;
      },
      has: (slug) => {
        const obj = stateRef.current?.slots.get(slug)?.obj;
        return !!obj && obj.children.length > 0;
      },
    });

    return () => {
      ro.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
      renderer.dispose();
      mount.removeChild(el);
      stateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    const loader = new GLTFLoader();
    const texLoader = new THREE.TextureLoader();

    for (const [slug, pick] of Object.entries(outfit)) {
      const key = pick ? `${gender}/${slug}/${pick.drawable}` : '';
      const cur = s.slots.get(slug);
      const texUrl = pick ? `${slotUrl(gender, slug, pick)}/${pick.texture}.png` : '';

      if (cur && cur.key === key) {
        if (pick) {
          const p = applyTexture(cur.obj, texLoader, texUrl).then(s.render);
          track(s.pending, p);
        }
        continue;
      }
      if (cur) {
        s.ped.remove(cur.obj);
        disposeMeshes(cur.obj);
        s.slots.delete(slug);
      }
      if (!pick) continue;

      const placeholder = new THREE.Group();
      s.slots.set(slug, { key, obj: placeholder });
      const p = loader
        .loadAsync(`${slotUrl(gender, slug, pick)}/mesh.glb`)
        .then(async (gltf) => {
          const live = s.slots.get(slug);
          if (!live || live.key !== key) return;
          gltf.scene.traverse((o) => {
            const m = o as THREE.SkinnedMesh;
            if (m.isMesh) {
              m.frustumCulled = false;
              m.material = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, alphaTest: 0.5 });
            }
          });
          await applyTexture(gltf.scene, texLoader, texUrl);
          s.ped.add(gltf.scene);
          s.slots.set(slug, { key, obj: gltf.scene });
          s.render();
        })
        .catch(() => {
          s.slots.delete(slug);
        });
      track(s.pending, p);
    }
    for (const slug of [...s.slots.keys()]) {
      if (!(slug in outfit)) {
        const gone = s.slots.get(slug)!.obj;
        s.ped.remove(gone);
        disposeMeshes(gone);
        s.slots.delete(slug);
      }
    }
  }, [gender, outfit]);

  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.scene.background = backdrop === 'transparent' ? null : new THREE.Color(BACKDROP[backdrop]);
    mountRef.current!.dataset.framing = framing;
    mountRef.current!.dataset.focus = focus ?? '';
    s.orbit.yaw = THREE.MathUtils.degToRad(yaw);
    s.orbit.zoom = 1;
    s.render();
  }, [backdrop, framing, yaw, focus]);

  return <div ref={mountRef} className={className} />;
}

function track(set: Set<Promise<void>>, p: Promise<void>) {
  set.add(p);
  p.finally(() => set.delete(p));
}

function disposeMeshes(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  });
}

const TEX_CACHE_MAX = 48;
const texCache = new Map<string, Promise<THREE.Texture>>();

async function applyTexture(root: THREE.Object3D, loader: THREE.TextureLoader, url: string) {
  let t = texCache.get(url);
  if (!t) {
    t = loader.loadAsync(url).then((tex) => {
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    });
    texCache.set(url, t);
    if (texCache.size > TEX_CACHE_MAX) {
      const [oldUrl, old] = texCache.entries().next().value!;
      texCache.delete(oldUrl);
      void old.then((tex) => tex.dispose()).catch(() => {});
    }
  } else {
    texCache.delete(url);
    texCache.set(url, t);
  }
  const tex = await t.catch(() => null);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.map = tex;
      mat.needsUpdate = true;
    }
  });
}
