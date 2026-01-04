import { useMemo } from 'react';
import { 
  EdgesGeometry, 
  LineBasicMaterial, 
  MeshBasicMaterial,
  EllipseCurve,
  BufferGeometry,
  Float32BufferAttribute,
} from 'three';
import type { FormConfig, ViewSettings } from '../types';

interface FormMeshProps {
  form: FormConfig;
  viewSettings: ViewSettings;
}

/**
 * Creates contour ellipse and edge line geometries for forms at UNIT size
 * These will be scaled by the form's scale to match the final rendered size
 */
function createFormLines(formType: string): BufferGeometry[] {
  const lines: BufferGeometry[] = [];
  
  if (formType === 'sphere') {
    // Sphere geometry has radius = 0.5 at unit size
    const radius = 0.5;
    
    // Equator (horizontal)
    const equator = new EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
    lines.push(new BufferGeometry().setFromPoints(equator.getPoints(64)));
    
    // Two meridians (vertical circles)
    const meridian1 = new EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
    lines.push(new BufferGeometry().setFromPoints(meridian1.getPoints(64)));
    
    const meridian2 = new EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
    lines.push(new BufferGeometry().setFromPoints(meridian2.getPoints(64)));
  } else if (formType === 'cylinder') {
    // Cylinder geometry has radius = 0.4, height = 1 at unit size
    const radius = 0.4;
    const halfHeight = 0.5;
    
    // Top circle
    const topCircle = new EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
    lines.push(new BufferGeometry().setFromPoints(topCircle.getPoints(64)));
    
    // Bottom circle
    const bottomCircle = new EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
    lines.push(new BufferGeometry().setFromPoints(bottomCircle.getPoints(64)));
    
    // Side lines (4 edges at 90 degree intervals)
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const sideGeom = new BufferGeometry();
      const positions = new Float32Array([
        x, halfHeight, z,  // top
        x, -halfHeight, z  // bottom
      ]);
      sideGeom.setAttribute('position', new Float32BufferAttribute(positions, 3));
      lines.push(sideGeom);
    }
  } else if (formType === 'cone') {
    // Cone geometry has radius = 0.5, height = 1 at unit size
    const radius = 0.5;
    const halfHeight = 0.5;
    
    // Base circle
    const baseCircle = new EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
    lines.push(new BufferGeometry().setFromPoints(baseCircle.getPoints(64)));
    
    // Lines from base to tip (4 edges at 90 degree intervals)
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const edgeGeom = new BufferGeometry();
      const positions = new Float32Array([
        x, -halfHeight, z,   // base
        0, halfHeight, 0     // tip
      ]);
      edgeGeom.setAttribute('position', new Float32BufferAttribute(positions, 3));
      lines.push(edgeGeom);
    }
  }
  
  return lines;
}

function FormMesh({ form, viewSettings }: FormMeshProps) {
  const isAngularForm = form.type === 'box' || form.type === 'pyramid';
  const isCurvedForm = form.type === 'sphere' || form.type === 'cylinder' || form.type === 'cone';
  
  // Edges for angular forms
  const edgesGeometry = useMemo(() => {
    if (!isAngularForm) return null;
    return new EdgesGeometry(form.geometry, 30);
  }, [form.geometry, isAngularForm]);
  
  // Line geometries for curved forms - unit size, scaled by group transform
  const formLines = useMemo(() => {
    if (!isCurvedForm) return [];
    return createFormLines(form.type);
  }, [form.type, isCurvedForm]);
  
  // Form fill - writes to depth buffer for proper occlusion
  const solidMaterial = useMemo(() => {
    if (viewSettings.formOpacity <= 0) return null;
    return new MeshBasicMaterial({
      color: '#f8fafc',
      transparent: true,
      opacity: viewSettings.formOpacity,
      depthWrite: true, // Write depth so intersection lines behind get properly occluded
    });
  }, [viewSettings.formOpacity]);
  
  // Line material - visible but not dominant so intersections stand out
  const lineMaterial = useMemo(() => {
    return new LineBasicMaterial({
      color: viewSettings.formEdgeColor,
      linewidth: 1,
      transparent: true,
      opacity: 0.75, // Mostly visible but not too bold
    });
  }, [viewSettings.formEdgeColor]);
  
  return (
    <group
      position={form.position}
      rotation={form.rotation}
      scale={form.scale}
    >
      {/* Form fill - render FIRST to establish depth buffer for proper line occlusion */}
      {solidMaterial && (
        <mesh geometry={form.geometry} material={solidMaterial} renderOrder={1} />
      )}
      
      {/* Edges for angular forms */}
      {edgesGeometry && (
        <lineSegments geometry={edgesGeometry} material={lineMaterial} />
      )}
      
      {/* Lines for sphere */}
      {form.type === 'sphere' && formLines.length >= 3 && (
        <>
          <line geometry={formLines[0]} material={lineMaterial} rotation={[Math.PI / 2, 0, 0]} />
          <line geometry={formLines[1]} material={lineMaterial} rotation={[0, 0, 0]} />
          <line geometry={formLines[2]} material={lineMaterial} rotation={[0, Math.PI / 2, 0]} />
        </>
      )}
      
      {/* Lines for cylinder - unit positions, scaled by group transform */}
      {form.type === 'cylinder' && formLines.length >= 6 && (
        <>
          {/* Top and bottom circles */}
          <line geometry={formLines[0]} material={lineMaterial} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <line geometry={formLines[1]} material={lineMaterial} position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Side lines */}
          <lineSegments geometry={formLines[2]} material={lineMaterial} />
          <lineSegments geometry={formLines[3]} material={lineMaterial} />
          <lineSegments geometry={formLines[4]} material={lineMaterial} />
          <lineSegments geometry={formLines[5]} material={lineMaterial} />
        </>
      )}
      
      {/* Lines for cone - unit positions, scaled by group transform */}
      {form.type === 'cone' && formLines.length >= 5 && (
        <>
          {/* Base circle */}
          <line geometry={formLines[0]} material={lineMaterial} position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Edge lines to tip */}
          <lineSegments geometry={formLines[1]} material={lineMaterial} />
          <lineSegments geometry={formLines[2]} material={lineMaterial} />
          <lineSegments geometry={formLines[3]} material={lineMaterial} />
          <lineSegments geometry={formLines[4]} material={lineMaterial} />
        </>
      )}
    </group>
  );
}

export default FormMesh;
