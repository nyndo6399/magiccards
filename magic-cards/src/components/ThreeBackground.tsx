import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 35;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Construct 3D extruded Heart geometry
    const heartShape = new THREE.Shape();
    const x = 0, y = 0;
    heartShape.moveTo(x + 5, y + 5);
    heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    heartShape.bezierCurveTo(x + 13, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    heartShape.bezierCurveTo(x + 6, y, x + 5, y + 5, x + 5, y + 5);

    const extrudeSettings = {
      depth: 2.2,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 2,
      bevelSize: 1,
      bevelThickness: 1,
    };

    const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    geometry.center();

    const heartsGroup = new THREE.Group();
    scene.add(heartsGroup);

    const heartCount = 45;
    const heartsData: Array<{
      mesh: THREE.Mesh;
      rotSpeedX: number;
      rotSpeedY: number;
      floatSpeed: number;
      floatOffset: number;
    }> = [];

    const pastelColors = [
      0xf472b6, 0xfb7185, 0xc084fc, 0xfbcfe8, 0xfed7aa, 0x93c5fd, 0xa7f3d0, 0xf43f5e,
    ];

    for (let i = 0; i < heartCount; i++) {
      const color = pastelColors[Math.floor(Math.random() * pastelColors.length)];
      const material = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 90,
        specular: 0xffffff,
        transparent: true,
        opacity: 0.75,
      });

      const mesh = new THREE.Mesh(geometry, material);
      const scale = Math.random() * 0.35 + 0.15;
      mesh.scale.set(scale, scale, scale);

      mesh.position.set(
        (Math.random() - 0.5) * 65,
        (Math.random() - 0.5) * 65,
        (Math.random() - 0.5) * 45
      );

      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      heartsGroup.add(mesh);
      heartsData.push({
        mesh,
        rotSpeedX: (Math.random() - 0.5) * 0.015,
        rotSpeedY: (Math.random() - 0.5) * 0.015,
        floatSpeed: Math.random() * 0.025 + 0.01,
        floatOffset: Math.random() * Math.PI * 2,
      });
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xf472b6, 2.5, 60);
    pointLight1.position.set(20, 20, 20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xc084fc, 2.0, 60);
    pointLight2.position.set(-20, -20, 20);
    scene.add(pointLight2);

    let mouseX = 0, mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 4;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 4;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      heartsData.forEach((item) => {
        item.mesh.rotation.x += item.rotSpeedX;
        item.mesh.rotation.y += item.rotSpeedY;
        item.mesh.position.y += Math.sin(time * item.floatSpeed + item.floatOffset) * 0.02;
      });

      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 w-full h-full opacity-60"
    />
  );
};
