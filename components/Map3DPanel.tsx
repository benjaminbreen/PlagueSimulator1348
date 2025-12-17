import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Entity, WealthTier } from '../types';
import { buildEntityPositionMap, buildItemLocationMap } from '../utils/mapUtils';
import { isOutdoorLocation, resolveWealthTier } from '../utils/locationWealth';

interface Map3DPanelProps {
  location: string;
  locationWealth: WealthTier;
  mapAscii: string;
  entities?: Entity[];
  interactables?: string[];
  lightMode?: boolean;
  onExitClick?: (label?: string) => void;
  onContainerClick?: (x: number, y: number) => void;
  onEntityClick?: (name: string) => void;
  onObjectClick?: (name: string) => void;
  playerName?: string;
  immediateLocation?: string;
}

const TILE_SIZE = 1;
const FLOOR_THICKNESS = 0.08;
const WALL_HEIGHT = 1.7;

const WALL_CHARS = new Set(['#', '|', '-', '_', '=', '┌', '┐', '└', '┘', '─', '│', '├', '┤', '┬', '┴', '┼', '▓', '▒', '⌂']);
const WATER_CHARS = new Set(['~', '≈']);
const CARPET_CHARS = new Set(['≋']);
const DECOR_CHARS = new Set(['◊']);
const EXIT_CHARS = new Set(['►', '◄', '▲', '▼', '⇨', '◀']);
const DOOR_CHARS = new Set(['+']);
const CONTAINER_CHARS = new Set(['▪', '◎']);
const INTERACTABLE_CHARS = new Set(['*', '$', '!', '?']);

const hashString = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => () => {
  let t = seed += 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const createTexture = (size: number, draw: (ctx: CanvasRenderingContext2D, rand: () => number) => void, seed: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const rand = mulberry32(seed);
  draw(ctx, rand);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const floorPalette: Record<WealthTier, { base: string; accent: string; grout: string }> = {
  poor: { base: '#5f4a3a', accent: '#7b5d49', grout: '#3e2d22' },
  modest: { base: '#7a6a5a', accent: '#9a846e', grout: '#4a3a2e' },
  merchant: { base: '#a28664', accent: '#c9a77c', grout: '#5a4432' },
  elite: { base: '#c9c1b1', accent: '#e6ddc8', grout: '#7a6f60' }
};

const wallPalette: Record<WealthTier, { base: string; accent: string; shadow: string }> = {
  poor: { base: '#6f5540', accent: '#8a6a52', shadow: '#3b2b20' },
  modest: { base: '#8b7560', accent: '#b49778', shadow: '#4b3b2e' },
  merchant: { base: '#b59a78', accent: '#d0b48b', shadow: '#5d4734' },
  elite: { base: '#d9d2c5', accent: '#f0e7d7', shadow: '#807468' }
};

const Map3DPanel: React.FC<Map3DPanelProps> = ({
  location,
  locationWealth,
  mapAscii,
  entities = [],
  interactables = [],
  lightMode = true,
  onExitClick,
  onContainerClick,
  onEntityClick,
  onObjectClick,
  playerName = 'Player'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const interactiveRef = useRef<THREE.Object3D[]>([]);
  const waterRef = useRef<THREE.Mesh[]>([]);
  const textureRef = useRef<THREE.Texture[]>([]);
  const frameRef = useRef<number | null>(null);

  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  const wealthTier = useMemo(
    () => resolveWealthTier(locationWealth, undefined, undefined, location),
    [locationWealth, location]
  );

  const isOutdoor = useMemo(() => isOutdoorLocation(location), [location]);

  useEffect(() => {
    if (!containerRef.current || rendererRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch (err) {
      setWebglError('WebGL unavailable');
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightMode ? '#d8cbb6' : '#0b0a07');
    scene.fog = new THREE.FogExp2(lightMode ? '#c2b095' : '#0b0a07', 0.06);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(6, 9, 10);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.target.set(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xfef7e7, 0x3a2f22, 0.6);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.2);
    keyLight.position.set(6, 12, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 12;
    keyLight.shadow.camera.bottom = -12;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcad9ff, 0.35);
    fillLight.position.set(-8, 7, -4);
    scene.add(fillLight);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

    containerRef.current.appendChild(renderer.domElement);

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width: newWidth, height: newHeight } = entry.contentRect;
      renderer.setSize(newWidth, newHeight);
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(containerRef.current);

    const animate = (time: number) => {
      controls.update();
      waterRef.current.forEach((mesh, index) => {
        mesh.position.y = FLOOR_THICKNESS * 0.3 + Math.sin(time * 0.001 + index) * 0.02;
      });
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.clear();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [lightMode]);

  const parsedMap = useMemo(() => {
    const normalized = (mapAscii || '').replace(/\r\n/g, '\n');
    const lines = normalized.split('\n').filter(line => line.length > 0);
    const width = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const rows = lines.map(line => line.padEnd(width, ' '));
    return { rows, width, height: rows.length };
  }, [mapAscii]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.background = new THREE.Color(lightMode ? '#d8cbb6' : '#0b0a07');
    scene.fog = new THREE.FogExp2(lightMode ? '#c2b095' : '#0b0a07', 0.06);

    if (groupRef.current) {
      scene.remove(groupRef.current);
      groupRef.current.traverse(obj => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else if (mat) {
          mat.dispose();
        }
      });
    }
    textureRef.current.forEach(texture => texture.dispose());
    textureRef.current = [];

    const group = new THREE.Group();
    interactiveRef.current = [];
    waterRef.current = [];

    const { rows, width, height } = parsedMap;
    const offsetX = -width * 0.5 + 0.5;
    const offsetZ = -height * 0.5 + 0.5;

    const seed = hashString(`${location}-${wealthTier}-${width}x${height}`);
    const random = mulberry32(seed);
    const floorSeed = seed + 7;
    const wallSeed = seed + 131;

    const floorTexture = createTexture(128, (ctx, rand) => {
      const palette = floorPalette[wealthTier];
      ctx.fillStyle = palette.base;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      if (isOutdoor) {
        for (let i = 0; i < 200; i += 1) {
          ctx.fillStyle = rand() > 0.6 ? palette.accent : palette.grout;
          const x = rand() * ctx.canvas.width;
          const y = rand() * ctx.canvas.height;
          const r = 1 + rand() * 3;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const tile = ctx.canvas.width / 8;
        ctx.strokeStyle = palette.grout;
        ctx.lineWidth = 2;
        for (let x = 0; x <= ctx.canvas.width; x += tile) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, ctx.canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y <= ctx.canvas.height; y += tile) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(ctx.canvas.width, y);
          ctx.stroke();
        }
        for (let i = 0; i < 50; i += 1) {
          ctx.fillStyle = rand() > 0.7 ? palette.accent : palette.base;
          const x = rand() * ctx.canvas.width;
          const y = rand() * ctx.canvas.height;
          ctx.fillRect(x, y, 2 + rand() * 6, 2 + rand() * 6);
        }
      }
    }, floorSeed);
    if (floorTexture) textureRef.current.push(floorTexture);

    const wallTexture = createTexture(128, (ctx, rand) => {
      const palette = wallPalette[wealthTier];
      ctx.fillStyle = palette.base;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      for (let i = 0; i < 90; i += 1) {
        const w = 8 + rand() * 20;
        const h = 4 + rand() * 12;
        const x = rand() * (ctx.canvas.width - w);
        const y = rand() * (ctx.canvas.height - h);
        ctx.fillStyle = rand() > 0.6 ? palette.accent : palette.shadow;
        ctx.globalAlpha = 0.3 + rand() * 0.4;
        ctx.fillRect(x, y, w, h);
      }
      ctx.globalAlpha = 1;
    }, wallSeed);
    if (wallTexture) textureRef.current.push(wallTexture);

    const skyTexture = createTexture(128, (ctx) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
      if (lightMode) {
        gradient.addColorStop(0, isOutdoor ? '#f6e6c7' : '#c4b39c');
        gradient.addColorStop(1, '#7f6b55');
      } else {
        gradient.addColorStop(0, '#1f2b33');
        gradient.addColorStop(1, '#050504');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }, seed + 77);
    if (skyTexture) textureRef.current.push(skyTexture);

    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture || undefined,
      color: floorPalette[wealthTier].base,
      roughness: isOutdoor ? 0.95 : 0.75,
      metalness: 0.05
    });
    if (floorTexture) {
      floorTexture.repeat.set(Math.max(1, width / 4), Math.max(1, height / 4));
      floorTexture.needsUpdate = true;
    }

    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture || undefined,
      color: wallPalette[wealthTier].base,
      roughness: 0.85,
      metalness: 0.02
    });
    if (wallTexture) {
      wallTexture.repeat.set(1.5, 1.5);
      wallTexture.needsUpdate = true;
    }

    const wallMaterialHeavy = new THREE.MeshStandardMaterial({
      color: wallPalette[wealthTier].shadow,
      roughness: 0.9,
      metalness: 0.02
    });

    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(width, FLOOR_THICKNESS, height),
      floorMaterial
    );
    ground.receiveShadow = true;
    ground.position.set(0, -FLOOR_THICKNESS / 2, 0);
    group.add(ground);

    if (skyTexture) {
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(45, 32, 32),
        new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide })
      );
      sky.position.y = 6;
      group.add(sky);
    }

    const itemMap = buildItemLocationMap(mapAscii, interactables);
    const entityMap = buildEntityPositionMap(mapAscii, entities);

    const findExitLabel = (x: number, y: number) => {
      const row = rows[y] || '';
      const after = row.slice(x);
      const before = row.slice(0, x);
      const matchAfter = after.match(/\[([^\]]+)\]/);
      if (matchAfter) return matchAfter[1];
      const matchBefore = before.match(/\[([^\]]+)\][^\[]*$/);
      return matchBefore ? matchBefore[1] : undefined;
    };

    rows.forEach((row, y) => {
      row.split('').forEach((char, x) => {
        const worldX = offsetX + x;
        const worldZ = offsetZ + y;

        if (WALL_CHARS.has(char)) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE),
            char === '▓' || char === '▒' ? wallMaterialHeavy : wallMaterial
          );
          wall.position.set(worldX, WALL_HEIGHT / 2, worldZ);
          wall.castShadow = true;
          wall.receiveShadow = true;
          group.add(wall);
          return;
        }

        if (WATER_CHARS.has(char)) {
          const water = new THREE.Mesh(
            new THREE.PlaneGeometry(TILE_SIZE * 0.95, TILE_SIZE * 0.95),
            new THREE.MeshStandardMaterial({
              color: isOutdoor ? '#3c6e8f' : '#2f566b',
              roughness: 0.35,
              metalness: 0.15,
              transparent: true,
              opacity: 0.85
            })
          );
          water.rotation.x = -Math.PI / 2;
          water.position.set(worldX, FLOOR_THICKNESS * 0.3, worldZ);
          water.receiveShadow = true;
          group.add(water);
          waterRef.current.push(water);
          return;
        }

        if (CARPET_CHARS.has(char)) {
          const rug = new THREE.Mesh(
            new THREE.PlaneGeometry(TILE_SIZE * 0.9, TILE_SIZE * 0.9),
            new THREE.MeshStandardMaterial({
              color: wealthTier === 'elite' ? '#7d2f2f' : '#6b3f2a',
              roughness: 0.8
            })
          );
          rug.rotation.x = -Math.PI / 2;
          rug.position.set(worldX, FLOOR_THICKNESS * 0.55, worldZ);
          rug.receiveShadow = true;
          group.add(rug);
        }

        if (DECOR_CHARS.has(char)) {
          const vase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.12, 0.4, 12),
            new THREE.MeshStandardMaterial({
              color: wealthTier === 'elite' ? '#d2b06a' : '#8d6a3b',
              roughness: 0.6,
              metalness: 0.2
            })
          );
          vase.position.set(worldX, 0.25, worldZ);
          vase.castShadow = true;
          group.add(vase);
        }

        if (DOOR_CHARS.has(char)) {
          const frame = new THREE.Group();
          const pillarGeo = new THREE.BoxGeometry(0.18, 1.2, 0.18);
          const lintelGeo = new THREE.BoxGeometry(0.7, 0.18, 0.18);
          const pillarMat = new THREE.MeshStandardMaterial({ color: wallPalette[wealthTier].accent, roughness: 0.6 });
          const left = new THREE.Mesh(pillarGeo, pillarMat);
          const right = new THREE.Mesh(pillarGeo, pillarMat);
          const top = new THREE.Mesh(lintelGeo, pillarMat);
          left.position.set(-0.25, 0.6, 0);
          right.position.set(0.25, 0.6, 0);
          top.position.set(0, 1.1, 0);
          frame.add(left, right, top);
          frame.position.set(worldX, 0, worldZ);
          frame.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) {
              (obj as THREE.Mesh).castShadow = true;
            }
          });
          group.add(frame);
        }

        if (EXIT_CHARS.has(char)) {
          const portal = new THREE.Group();
          const archMat = new THREE.MeshStandardMaterial({ color: wallPalette[wealthTier].accent, roughness: 0.5 });
          const columnGeo = new THREE.BoxGeometry(0.18, 1.6, 0.18);
          const archGeo = new THREE.BoxGeometry(0.9, 0.2, 0.18);
          const left = new THREE.Mesh(columnGeo, archMat);
          const right = new THREE.Mesh(columnGeo, archMat);
          const top = new THREE.Mesh(archGeo, archMat);
          left.position.set(-0.3, 0.8, 0);
          right.position.set(0.3, 0.8, 0);
          top.position.set(0, 1.55, 0);
          portal.add(left, right, top);

          const glow = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 1.0),
            new THREE.MeshStandardMaterial({
              color: lightMode ? '#f4d58d' : '#6ddad1',
              emissive: lightMode ? '#f4d58d' : '#6ddad1',
              emissiveIntensity: 0.6,
              transparent: true,
              opacity: 0.5
            })
          );
          glow.position.set(0, 0.6, 0.11);
          portal.add(glow);
          portal.position.set(worldX, 0, worldZ);
          portal.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) {
              (obj as THREE.Mesh).castShadow = true;
            }
          });
          const label = findExitLabel(x, y);
          portal.userData = { type: 'exit', label, x, y };
          interactiveRef.current.push(portal);
          group.add(portal);
        }

        if (CONTAINER_CHARS.has(char)) {
          const container = new THREE.Group();
          if (char === '▪') {
            const base = new THREE.Mesh(
              new THREE.BoxGeometry(0.6, 0.35, 0.4),
              new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.7 })
            );
            const lid = new THREE.Mesh(
              new THREE.BoxGeometry(0.62, 0.12, 0.42),
              new THREE.MeshStandardMaterial({ color: '#805a38', roughness: 0.6 })
            );
            base.position.y = 0.18;
            lid.position.y = 0.38;
            container.add(base, lid);
          } else {
            const jar = new THREE.Mesh(
              new THREE.CylinderGeometry(0.2, 0.25, 0.5, 16),
              new THREE.MeshStandardMaterial({ color: '#b48b5a', roughness: 0.5 })
            );
            jar.position.y = 0.25;
            container.add(jar);
          }
          container.position.set(worldX, 0, worldZ);
          container.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) {
              (obj as THREE.Mesh).castShadow = true;
            }
          });
          container.userData = { type: 'container', x, y };
          interactiveRef.current.push(container);
          group.add(container);
        }

        if (INTERACTABLE_CHARS.has(char)) {
          const label = itemMap.get(`${x},${y}`) || 'object';
          const pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.28, 0.2, 12),
            new THREE.MeshStandardMaterial({ color: '#4a3b2d', roughness: 0.7 })
          );
          const orb = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 16, 16),
            new THREE.MeshStandardMaterial({
              color: '#e6d398',
              emissive: '#e6d398',
              emissiveIntensity: 0.5,
              roughness: 0.4
            })
          );
          pedestal.position.y = 0.1;
          orb.position.y = 0.4;
          const groupObj = new THREE.Group();
          groupObj.add(pedestal, orb);
          groupObj.position.set(worldX, 0, worldZ);
          groupObj.userData = { type: 'interactable', label };
          interactiveRef.current.push(groupObj);
          group.add(groupObj);
        }

        if (char === '◙' || char === '○') {
          const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.4, 0.25, 18),
            new THREE.MeshStandardMaterial({ color: '#85715b', roughness: 0.8 })
          );
          base.position.set(worldX, 0.12, worldZ);
          base.castShadow = true;
          base.receiveShadow = true;
          group.add(base);

          if (char === '◙') {
            const water = new THREE.Mesh(
              new THREE.CircleGeometry(0.28, 20),
              new THREE.MeshStandardMaterial({ color: '#3d6b85', transparent: true, opacity: 0.85 })
            );
            water.rotation.x = -Math.PI / 2;
            water.position.set(worldX, 0.25, worldZ);
            group.add(water);
          }
        }

        if (char === '●') {
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.12, 0.6, 10),
            new THREE.MeshStandardMaterial({ color: '#4d3b2a', roughness: 0.9 })
          );
          const canopy = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 16, 16),
            new THREE.MeshStandardMaterial({ color: '#3f6b3b', roughness: 0.8 })
          );
          trunk.position.set(worldX, 0.3, worldZ);
          canopy.position.set(worldX, 0.8, worldZ);
          trunk.castShadow = true;
          canopy.castShadow = true;
          group.add(trunk, canopy);
        }

        if (/[A-Z]/.test(char) && char !== '@' && char !== '[' && char !== ']') {
          const entity = entityMap.get(`${x},${y}`);
          if (entity) {
            const npc = new THREE.Group();
            const body = new THREE.Mesh(
              new THREE.CylinderGeometry(0.18, 0.22, 0.6, 12),
              new THREE.MeshStandardMaterial({ color: '#6f8bbd', roughness: 0.6 })
            );
            const head = new THREE.Mesh(
              new THREE.SphereGeometry(0.18, 16, 16),
              new THREE.MeshStandardMaterial({ color: '#c9a07f', roughness: 0.4 })
            );
            body.position.y = 0.35;
            head.position.y = 0.75;
            npc.add(body, head);
            npc.position.set(worldX, 0, worldZ);
            npc.traverse(obj => {
              if ((obj as THREE.Mesh).isMesh) {
                (obj as THREE.Mesh).castShadow = true;
              }
            });
            npc.userData = { type: 'npc', name: entity.name };
            interactiveRef.current.push(npc);
            group.add(npc);
          }
        }

        if (char === '@') {
          const player = new THREE.Group();
          const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.25, 0.7, 12),
            new THREE.MeshStandardMaterial({
              color: lightMode ? '#b5522f' : '#6ddad1',
              emissive: lightMode ? '#8e3a1b' : '#3ab8ac',
              emissiveIntensity: 0.2
            })
          );
          const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshStandardMaterial({ color: '#d1a482', roughness: 0.4 })
          );
          body.position.y = 0.4;
          head.position.y = 0.85;
          player.add(body, head);
          player.position.set(worldX, 0, worldZ);
          player.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) {
              (obj as THREE.Mesh).castShadow = true;
            }
          });
          player.userData = { type: 'player', name: playerName };
          interactiveRef.current.push(player);
          group.add(player);
        }
      });
    });

    const vignette = new THREE.Mesh(
      new THREE.RingGeometry(width * 0.6, width * 0.9, 64),
      new THREE.MeshBasicMaterial({ color: lightMode ? '#8d7b63' : '#070503', transparent: true, opacity: 0.08 })
    );
    vignette.rotation.x = -Math.PI / 2;
    vignette.position.y = 0.01;
    group.add(vignette);

    groupRef.current = group;
    scene.add(group);
  }, [parsedMap, interactables, entities, location, wealthTier, lightMode, playerName, isOutdoor, mapAscii]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer || !camera) return;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveRef.current, true);
      if (!hits.length) {
        setHoverLabel(null);
        renderer.domElement.style.cursor = 'default';
        return;
      }
      let target: THREE.Object3D | null = hits[0].object;
      while (target && !target.userData?.type && target.parent) {
        target = target.parent;
      }
      if (!target?.userData?.type) {
        setHoverLabel(null);
        renderer.domElement.style.cursor = 'default';
        return;
      }
      renderer.domElement.style.cursor = 'pointer';
      const { type, name, label } = target.userData;
      const text = type === 'npc'
        ? name
        : type === 'player'
          ? `You (${name || playerName})`
          : type === 'interactable'
            ? label
            : type === 'container'
              ? 'Container'
              : type === 'exit'
                ? `Exit${label ? `: ${label}` : ''}`
                : 'Object';
      setHoverLabel(text);
    };

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveRef.current, true);
      if (!hits.length) return;
      let target: THREE.Object3D | null = hits[0].object;
      while (target && !target.userData?.type && target.parent) {
        target = target.parent;
      }
      if (!target?.userData?.type) return;
      const { type, name, label, x, y } = target.userData;
      if (type === 'npc' && name && onEntityClick) {
        onEntityClick(name);
      } else if (type === 'interactable' && label && onObjectClick) {
        onObjectClick(label);
      } else if (type === 'container' && typeof x === 'number' && typeof y === 'number' && onContainerClick) {
        onContainerClick(x, y);
      } else if (type === 'exit' && onExitClick) {
        onExitClick(label);
      }
    };

    const handleLeave = () => setHoverLabel(null);

    renderer.domElement.addEventListener('pointermove', handlePointer);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('pointerleave', handleLeave);

    return () => {
      renderer.domElement.removeEventListener('pointermove', handlePointer);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('pointerleave', handleLeave);
    };
  }, [onEntityClick, onObjectClick, onExitClick, onContainerClick, playerName]);

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs opacity-70">
        3D map unavailable: {webglError}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {hoverLabel && (
        <div className={`absolute bottom-3 left-3 px-3 py-1 text-[10px] uppercase tracking-[0.2em] rounded border ${lightMode ? 'bg-[#f7f1e5] border-[#5d4037]/40 text-[#3e2723]' : 'bg-black/70 border-green-800 text-green-200'}`}>
          {hoverLabel}
        </div>
      )}
      <div className={`absolute top-3 right-3 text-[10px] uppercase tracking-[0.2em] ${lightMode ? 'text-[#5d4037]' : 'text-green-400'}`}>
        Drag to orbit / Scroll to zoom
      </div>
    </div>
  );
};

export default Map3DPanel;
