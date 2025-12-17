import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
// @ts-ignore
import land110m from 'world-atlas/land-110m.json';

interface GlobeProps {
  width: number;
  height: number;
  paused?: boolean;
  zoom?: number;
}

const damascusCoords: [number, number] = [36.2765, 33.5138];

const Globe: React.FC<GlobeProps> = ({ width, height, paused = false, zoom = 1 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const pathRef = useRef<d3.GeoPath<any, d3.GeoPermissibleObjects> | null>(null);
  const timerRef = useRef<d3.Timer | null>(null);
  const pausedRef = useRef<boolean>(paused);
  const baseScaleRef = useRef<number>(height / 2.5);
  const landFeatures = useMemo(() => feature(land110m as any, (land110m as any).objects.land), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const projection = d3.geoOrthographic()
      .scale(baseScaleRef.current * zoom)
      .translate([width / 2, height / 2])
      .clipAngle(90);

    projection.rotate([-36, -33, 0]);

    const path = d3.geoPath().projection(projection).context(context);
    const graticule = d3.geoGraticule();

    projectionRef.current = projection;
    pathRef.current = path;

    const render = () => {
      context.clearRect(0, 0, width, height);

      // Ocean fill + sphere outline
      context.beginPath();
      path({ type: 'Sphere' } as any);
      context.fillStyle = 'rgba(12, 45, 18, 0.35)';
      context.strokeStyle = 'rgba(74, 222, 128, 0.8)';
      context.lineWidth = 1.5;
      context.fill();
      context.stroke();

      // Graticule
      context.beginPath();
      path(graticule());
      context.strokeStyle = 'rgba(74, 222, 128, 0.15)';
      context.setLineDash([2, 4]);
      context.lineWidth = 1;
      context.stroke();
      context.setLineDash([]);

      // Land masses (real topojson)
      context.beginPath();
      path(landFeatures as any);
      context.fillStyle = 'rgba(74, 222, 128, 0.28)';
      context.strokeStyle = 'rgba(74, 222, 128, 0.7)';
      context.lineWidth = 1.2;
      context.fill();
      context.stroke();

      // Damascus marker
      const center = projection(damascusCoords);
      if (center) {
        context.beginPath();
        context.moveTo(center[0] - 5, center[1]);
        context.lineTo(center[0] + 5, center[1]);
        context.moveTo(center[0], center[1] - 5);
        context.lineTo(center[0], center[1] + 5);
        context.strokeStyle = '#fbbf24';
        context.lineWidth = 2;
        context.shadowColor = 'rgba(251,191,36,0.8)';
        context.shadowBlur = 6;
        context.stroke();
        context.shadowBlur = 0;
      }
    };

    const renderRef = render;

    const spin = d3.timer(() => {
      if (pausedRef.current) return;
      const rot = projection.rotate();
      projection.rotate([rot[0] + 0.08, rot[1], rot[2]]);
      renderRef();
    });

    timerRef.current = spin;
    render();

    const canvasSelection = d3.select(canvas);
    let v0: [number, number] | null = null;
    let r0: [number, number, number] | null = null;

    const drag = d3.drag()
      .on('start', (event) => {
        v0 = [event.x, event.y];
        r0 = projection.rotate();
      })
      .on('drag', (event) => {
        if (!v0 || !r0) return;
        const v1: [number, number] = [event.x, event.y];
        const k = 75 / projection.scale();
        projection.rotate([
          r0[0] + (v1[0] - v0[0]) * k,
          r0[1] - (v1[1] - v0[1]) * k,
          r0[2]
        ]);
        renderRef();
      })
      .on('end', () => {
        v0 = null;
      });

    canvasSelection.call(drag as any);

    return () => {
      spin.stop();
      timerRef.current = null;
    };
  }, [width, height]);

  // Update pause state
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Update zoom without rebuilding the world
  useEffect(() => {
    const proj = projectionRef.current;
    const path = pathRef.current;
    const canvas = canvasRef.current;
    if (!proj || !path || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    proj.scale(baseScaleRef.current * zoom);

    const graticule = d3.geoGraticule();

    ctx.clearRect(0, 0, width, height);

    ctx.beginPath();
    path({ type: 'Sphere' } as any);
    ctx.fillStyle = 'rgba(12, 45, 18, 0.35)';
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    path(graticule());
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.15)';
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    path(landFeatures as any);
    ctx.fillStyle = 'rgba(74, 222, 128, 0.28)';
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();

    const center = proj(damascusCoords);
    if (center) {
      ctx.beginPath();
      ctx.moveTo(center[0] - 5, center[1]);
      ctx.lineTo(center[0] + 5, center[1]);
      ctx.moveTo(center[0], center[1] - 5);
      ctx.lineTo(center[0], center[1] + 5);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(251,191,36,0.8)';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [zoom, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="cursor-move"
    />
  );
};

export default Globe;
