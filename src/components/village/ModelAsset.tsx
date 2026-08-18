'use client';

import { Component, Suspense, useMemo, type ErrorInfo, type ReactNode } from 'react';
import { Instance, Instances, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export type AssetVector3 = [number, number, number];

export interface AssetTransform {
  position: AssetVector3;
  rotation?: AssetVector3;
  scale?: number | AssetVector3;
}

interface AssetBoundaryProps {
  url: string;
  fallback: ReactNode;
  children: ReactNode;
}

interface AssetBoundaryState {
  failed: boolean;
}

class AssetBoundary extends Component<AssetBoundaryProps, AssetBoundaryState> {
  state: AssetBoundaryState = { failed: false };

  static getDerivedStateFromError(): AssetBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[SAH World] 3D model could not be loaded: ${this.props.url}. Using a placeholder instead.`, error, info.componentStack);
  }

  componentDidUpdate(previous: AssetBoundaryProps) {
    if (previous.url !== this.props.url && this.state.failed) this.setState({ failed: false });
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function AssetPlaceholder({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = '#7c3aed',
}: AssetTransform & { color?: string }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.72} />
      </mesh>
    </group>
  );
}

interface GltfModelProps extends AssetTransform {
  url: string;
  tint?: string;
  tintStrength?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

function GltfModel({
  url,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  tint,
  tintStrength = 0.22,
  emissive,
  emissiveIntensity = 0,
}: GltfModelProps) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const next = scene.clone(true);
    next.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const source = Array.isArray(child.material) ? child.material : [child.material];
      const materials = source.map(material => {
        const cloned = material.clone();
        if ('color' in cloned && cloned.color instanceof THREE.Color && tint) {
          cloned.color.lerp(new THREE.Color(tint), tintStrength);
        }
        if ('emissive' in cloned && cloned.emissive instanceof THREE.Color && emissive) {
          cloned.emissive.set(emissive);
          if ('emissiveIntensity' in cloned) cloned.emissiveIntensity = emissiveIntensity;
        }
        return cloned;
      });
      child.material = Array.isArray(child.material) ? materials : materials[0];
    });
    return next;
  }, [emissive, emissiveIntensity, scene, tint, tintStrength]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={clone} dispose={null} />
    </group>
  );
}

export function SafeGltfModel(props: GltfModelProps & { fallbackColor?: string }) {
  const { fallbackColor, ...modelProps } = props;
  const fallback = <AssetPlaceholder position={props.position} rotation={props.rotation} scale={props.scale} color={fallbackColor} />;
  return (
    <AssetBoundary url={props.url} fallback={fallback}>
      <Suspense fallback={fallback}>
        <GltfModel {...modelProps} />
      </Suspense>
    </AssetBoundary>
  );
}

interface MeshPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  name: string;
}

function GltfInstanceSet({ url, transforms }: { url: string; transforms: AssetTransform[] }) {
  const { scene } = useGLTF(url);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const result: MeshPart[] = [];
    scene.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      const geometry = child.geometry.clone();
      geometry.applyMatrix4(child.matrixWorld);
      result.push({ geometry, material: child.material, name: `${child.name}-${result.length}` });
    });
    if (result.length === 0) throw new Error(`No renderable mesh found in ${url}`);
    return result;
  }, [scene, url]);

  return (
    <group>
      {parts.map(part => (
        <Instances
          key={part.name}
          geometry={part.geometry}
          material={part.material}
          limit={transforms.length}
          range={transforms.length}
          castShadow
          receiveShadow
        >
          {transforms.map((transform, index) => (
            <Instance
              key={index}
              position={transform.position}
              rotation={transform.rotation ?? [0, 0, 0]}
              scale={transform.scale ?? 1}
            />
          ))}
        </Instances>
      ))}
    </group>
  );
}

function InstanceFallback({ transforms }: { transforms: AssetTransform[] }) {
  return (
    <group>
      {transforms.map((transform, index) => (
        <AssetPlaceholder key={index} {...transform} color="#64748b" />
      ))}
    </group>
  );
}

export function SafeGltfInstances({ url, transforms }: { url: string; transforms: AssetTransform[] }) {
  if (transforms.length === 0) return null;
  const fallback = <InstanceFallback transforms={transforms} />;
  return (
    <AssetBoundary url={url} fallback={fallback}>
      <Suspense fallback={fallback}>
        <GltfInstanceSet url={url} transforms={transforms} />
      </Suspense>
    </AssetBoundary>
  );
}

export function preloadGltfAssets(urls: string[]) {
  urls.forEach(url => useGLTF.preload(url));
}

