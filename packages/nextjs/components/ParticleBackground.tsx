"use client";

import { useEffect, useRef } from "react";

interface Point {
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
}

interface ParticleBackgroundProps {
  className?: string;
}

export const ParticleBackground = ({ className = "" }: ParticleBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Particle system configuration
    const config = {
      points: [] as Point[],
      forcePointEnabled: true,
      currentCursorPosition: { x: 0, y: 0 },
      
      // Background settings
      transparentBackground: true,
      backgroundColor: "#000000",
      
      // Points settings
      pointsCount: 80,
      pointColor: "#ffffff",
      pointSize: 1.5,
      
      // Motion settings
      velocityRatio: 1,
      velocityDecay: 0.8,
      gravity: 0,
      bounce: 1,
      
      // Lines settings
      lineWidth: 0.3,
      lineDistance: 120,
      linesColor: "#ffffff",
      linesGradientEnabled: true,
      linesGradientStartColor: "#ffffff",
      linesGradientMiddleColor: "#ffffff",
      linesGradientEndColor: "#ffffff",
    };

    const randomInRange = (min: number, max: number) => {
      return min + (max - min) * Math.random();
    };

    const initPoints = () => {
      config.points = [];
      for (let i = 0; i < config.pointsCount; i++) {
        config.points[i] = {
          mass: 50,
          x: randomInRange(5, canvas.width - 5),
          y: randomInRange(5, canvas.height - 5),
          vx: randomInRange(-0.5, 0.5),
          vy: randomInRange(-0.5, 0.5),
          ax: 0,
          ay: 0,
        };
      }
    };

    const updatePoints = () => {
      // Apply force point if enabled
      if (config.forcePointEnabled) {
        for (let i = 0; i < config.points.length; i++) {
          const pt = config.points[i];
          const dx = config.currentCursorPosition.x - pt.x;
          const dy = config.currentCursorPosition.y - pt.y;
          const d = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);

          if (d < 150) {
            const force = (150 - d) / 150;
            pt.ax = force * 0.3 * Math.cos(ang);
            pt.ay = force * 0.3 * Math.sin(ang);
          }
        }
      }

      // Update position with velocity and gravity for every point
      for (let i = 0; i < config.points.length; i++) {
        const pt = config.points[i];
        pt.ax *= 0.1;
        pt.vx += pt.ax * config.velocityRatio * config.velocityDecay;
        pt.x += pt.vx;

        pt.ay *= 0.1;
        pt.vy += (pt.ay + config.gravity) * config.velocityRatio * config.velocityDecay;
        pt.y += pt.vy;

        // Collide using canvas box
        if (pt.x > canvas.width - config.pointSize) {
          pt.x = canvas.width - config.pointSize;
          pt.vx = -pt.vx * config.bounce;
        }
        if (pt.x < config.pointSize) {
          pt.x = config.pointSize;
          pt.vx = -pt.vx * config.bounce;
        }

        if (pt.y > canvas.height - config.pointSize) {
          pt.y = canvas.height - config.pointSize;
          pt.vy = -pt.vy * config.bounce;
        }

        if (pt.y < config.pointSize) {
          pt.y = config.pointSize;
          pt.vy = -pt.vy * config.bounce;
        }
      }
    };

    const drawPoints = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!config.transparentBackground) {
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.lineWidth = config.lineWidth;
      ctx.lineCap = "round";

      // Draw lines between points
      for (let i = 0; i < config.points.length; i++) {
        const pt = config.points[i];

        for (let j = config.points.length - 1; j > i; j--) {
          if (i === j) continue;

          const pt2 = config.points[j];
          const distance = Math.hypot(pt2.x - pt.x, pt2.y - pt.y);

          if (distance <= config.lineDistance) {
            const opacity = 1 - distance / config.lineDistance;
            
            if (config.linesGradientEnabled) {
              const gradient = ctx.createLinearGradient(pt.x, pt.y, pt2.x, pt2.y);
              const opacityHex = Math.floor(opacity * 255).toString(16).padStart(2, '0');
              gradient.addColorStop(0, config.linesGradientStartColor + opacityHex);
              gradient.addColorStop(0.5, config.linesGradientMiddleColor + opacityHex);
              gradient.addColorStop(1, config.linesGradientEndColor + opacityHex);
              ctx.strokeStyle = gradient;
            } else {
              const opacityHex = Math.floor(opacity * 255).toString(16).padStart(2, '0');
              ctx.strokeStyle = config.linesColor + opacityHex;
            }
            
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt2.x, pt2.y);
            ctx.stroke();
            ctx.closePath();
          }
        }
      }

      // Draw points
      for (let i = 0; i < config.points.length; i++) {
        const pt = config.points[i];
        ctx.fillStyle = config.pointColor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, config.pointSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();
      }
    };

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      config.currentCursorPosition.x = (e.clientX - rect.left) * window.devicePixelRatio;
      config.currentCursorPosition.y = (e.clientY - rect.top) * window.devicePixelRatio;
    };

    const animate = () => {
      updatePoints();
      drawPoints();
      animationRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    resizeCanvas();
    initPoints();
    
    // Event listeners
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousemove", handleMouseMove);
    
    // Start animation
    animate();

    // Store reference for cleanup
    particlesRef.current = { config, resizeCanvas, initPoints };

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      style={{ width: "100%", height: "100%" }}
    />
  );
};
