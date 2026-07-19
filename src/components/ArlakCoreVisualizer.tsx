import React, { useEffect, useRef } from "react";
import { ArlakAudioSession, LiveState } from "../lib/audio";

export type ArlakEmotion = 
  | "idle" 
  | "happy" 
  | "excited" 
  | "curious" 
  | "thinking" 
  | "proud" 
  | "sad" 
  | "confused" 
  | "surprised" 
  | "embarrassed" 
  | "playful";

interface ArlakCoreVisualizerProps {
  session: ArlakAudioSession | null;
  state: LiveState;
  themeColor: string; // Violet, crimson, emerald, celestial, gold, rose, charcoal
  activeEmotion?: ArlakEmotion;
  characterState: "idle" | "thinking" | "talking";
}

export const ArlakCoreVisualizer: React.FC<ArlakCoreVisualizerProps> = ({
  session,
  state,
  themeColor,
  activeEmotion = "idle",
  characterState
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Interaction and tracking references
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  
  // Physics & Animation states
  const speechVolumeRef = useRef<number>(0);
  
  // Track cursor position trail history
  const trailRef = useRef<Array<{
    x: number;
    y: number;
    hue: number;
    age: number;
    maxAge: number;
  }>>([]);

  // Track cursor position globally
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : e.clientX;
      const y = rect ? e.clientY - rect.top : e.clientY;

      targetMouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };

      // Shifting colorful HSL hue spectrum color selection
      const hue = (performance.now() * 0.08) % 360;

      // Add trail point
      trailRef.current.push({
        x,
        y,
        hue,
        age: 0,
        maxAge: 40 // Trail points survive for 40 animation frames
      });

      // Cap size to prevent unlimited array growth
      if (trailRef.current.length > 35) {
        trailRef.current.shift();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Theme matching mapping function (cinematic color tones)
  const getGlowColors = () => {
    switch (themeColor) {
      case "violet":
        return {
          primary: "rgba(147, 51, 234, 1)",
          secondary: "rgba(192, 38, 211, 0.85)",
          glow: "rgba(168, 85, 247, 0.7)",
          colors: ["#a855f7", "#c084fc", "#e879f9", "#818cf8"]
        };
      case "crimson":
        return {
          primary: "rgba(225, 29, 72, 1)",
          secondary: "rgba(234, 88, 12, 0.85)",
          glow: "rgba(244, 63, 94, 0.7)",
          colors: ["#f43f5e", "#fb7185", "#f97316", "#fda4af"]
        };
      case "emerald":
        return {
          primary: "rgba(5, 150, 105, 1)",
          secondary: "rgba(13, 148, 136, 0.85)",
          glow: "rgba(16, 185, 129, 0.7)",
          colors: ["#10b981", "#34d399", "#14b8a6", "#2dd4bf"]
        };
      case "celestial":
        return {
          primary: "rgba(2, 132, 199, 1)",
          secondary: "rgba(6, 182, 212, 0.85)",
          glow: "rgba(14, 165, 233, 0.7)",
          colors: ["#06b6d4", "#22d3ee", "#0ea5e9", "#38bdf8"]
        };
      case "gold":
        return {
          primary: "rgba(202, 138, 4, 1)",
          secondary: "rgba(245, 158, 11, 0.85)",
          glow: "rgba(234, 179, 8, 0.7)",
          colors: ["#eab308", "#facc15", "#f59e0b", "#fbbf24"]
        };
      case "rose":
        return {
          primary: "rgba(219, 39, 119, 1)",
          secondary: "rgba(244, 63, 94, 0.85)",
          glow: "rgba(236, 72, 153, 0.7)",
          colors: ["#ec4899", "#f472b6", "#f43f5e", "#ff85a2"]
        };
      default: // celestial/cyan default
        return {
          primary: "rgba(34, 211, 238, 1)",
          secondary: "rgba(79, 70, 229, 0.85)",
          glow: "rgba(6, 182, 212, 0.7)",
          colors: ["#06b6d4", "#6366f1", "#4f46e5", "#818cf8"]
        };
    }
  };

  // Main Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const systemTime = performance.now();
      const colors = getGlowColors();

      // Dynamic Audio analysis fetching from voice session
      let audioLevel = 0;
      let bufferLength = 64;
      const dataArray = new Uint8Array(bufferLength);
      let activeAnalyser = null;

      if (state === "speaking" && session?.outputAnalyser) {
        activeAnalyser = session.outputAnalyser;
      } else if (state === "listening" && session?.inputAnalyser) {
        activeAnalyser = session.inputAnalyser;
      }

      if (activeAnalyser) {
        try {
          activeAnalyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          audioLevel = sum / bufferLength; // 0 to 255
        } catch (e) {}
      }

      // Smooth amplitude tracking for real-time visual excitement
      speechVolumeRef.current += (audioLevel / 255 - speechVolumeRef.current) * 0.15;

      const baseScale = Math.min(width, height) / 600;
      const s = Math.max(0.75, Math.min(1.4, baseScale)); // scale multiplier

      // Smooth cursor mouse tracking lag
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;

      const centerX = width / 2;
      const centerY = height / 2.3; // Center offset slightly upward for header/footer headroom

      // Parallax center coordinates based on mouse position
      const targetCenterX = centerX + (mouseRef.current.x - 0.5) * 80 * s;
      const targetCenterY = centerY + (mouseRef.current.y - 0.5) * 50 * s;

      // ==========================================
      // 1. DRAW LIQUID BACKGROUND FLOW RIBBONS (Fluid version of flow trail)
      // ==========================================
      ctx.save();
      
      const waveCount = 5;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const speed = 0.0006 + w * 0.0002;
        const phase = w * (Math.PI / 2.5);
        const amplitude = (20 + w * 12) * s * (1 + speechVolumeRef.current * 0.6);
        const wavelength = 0.003 - w * 0.0003;
        
        // Horizontal offset representing flow from left to right
        const flowTime = systemTime * speed;
        
        ctx.lineWidth = (4 + w * 2.5) * s;
        ctx.strokeStyle = colors.colors[w % colors.colors.length];
        
        // Smoothly fade ribbons as they approach sides
        const ribbonGrad = ctx.createLinearGradient(0, 0, width, 0);
        ribbonGrad.addColorStop(0, "rgba(0,0,0,0)");
        ribbonGrad.addColorStop(0.2, colors.colors[w % colors.colors.length] + "22");
        ribbonGrad.addColorStop(0.5, colors.colors[w % colors.colors.length] + "55");
        ribbonGrad.addColorStop(0.8, colors.colors[w % colors.colors.length] + "22");
        ribbonGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = ribbonGrad;

        for (let x = 0; x <= width; x += 10) {
          // Liquid sinusoidal wave math with vertical drift
          const y = targetCenterY + Math.sin(x * wavelength + flowTime + phase) * amplitude
                    + Math.cos(x * 0.001 - flowTime * 0.4) * 20 * s;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
      ctx.restore();

      // ==========================================
      // 2. DRAW VOLUMETRIC GLOW CORE BACKLIGHT (Conical stage projector)
      // ==========================================
      ctx.save();
      const baseDiameterX = 320 * s;
      const conicalBeamGrad = ctx.createLinearGradient(targetCenterX, centerY - 150 * s, targetCenterX, height);
      conicalBeamGrad.addColorStop(0, "rgba(0,0,0,0)");
      conicalBeamGrad.addColorStop(0.3, colors.primary.replace("1)", "0.02)"));
      conicalBeamGrad.addColorStop(0.65, colors.primary.replace("1)", "0.06)"));
      conicalBeamGrad.addColorStop(1, colors.secondary.replace("0.85)", "0.15)"));

      ctx.fillStyle = conicalBeamGrad;
      ctx.beginPath();
      ctx.moveTo(targetCenterX - baseDiameterX * 0.25, targetCenterY - 100 * s);
      ctx.lineTo(targetCenterX + baseDiameterX * 0.25, targetCenterY - 100 * s);
      ctx.lineTo(targetCenterX + baseDiameterX * 1.6, height);
      ctx.lineTo(targetCenterX - baseDiameterX * 1.6, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // ==========================================
      // 3. DRAW DYNAMIC LIQUID BLOB OBJECTS (Multi-layered core presence)
      // ==========================================
      ctx.save();

      // Setup organic liquid blob drawer
      const drawLiquidBlob = (
        centerX: number,
        centerY: number,
        baseRadius: number,
        layersCount: number,
        speedMultiplier: number,
        rippleFrequency: number,
        baseOpacity: number,
        isThinking: boolean,
        isTalking: boolean
      ) => {
        const timeFactor = systemTime * 0.001 * speedMultiplier;
        
        for (let l = 0; l < layersCount; l++) {
          const layerOpacity = baseOpacity * (1 - l * 0.22);
          const layerRadius = baseRadius * (1 - l * 0.12);
          
          ctx.beginPath();
          
          const points = 72; // Detailed resolution for organic liquid rendering
          const angleStep = (Math.PI * 2) / points;
          
          for (let i = 0; i < points; i++) {
            const angle = i * angleStep;
            
            // Standard fluid wave deformation algorithms
            let deformation = 0;
            
            if (isThinking) {
              // Swift circular orbital ripples
              deformation += Math.sin(angle * rippleFrequency + timeFactor * 3.5 + l) * 16 * s;
              deformation += Math.cos(angle * 3.0 - timeFactor * 2.0) * 10 * s;
            } else if (isTalking) {
              // High response volume pulsing waves
              const voiceImpact = speechVolumeRef.current * 85 * s;
              deformation += Math.sin(angle * 5.0 + timeFactor * 5.0 + l) * (12 * s + voiceImpact * 0.5);
              deformation += Math.cos(angle * 8.0 - timeFactor * 6.5) * (4 * s + voiceImpact * 0.7);
              deformation += Math.sin(angle * 2.0 + timeFactor * 1.5) * (8 * s + voiceImpact * 0.2);
            } else {
              // Calm breathing idle ripples
              deformation += Math.sin(angle * 3.0 + timeFactor * 1.2 + l) * 9 * s;
              deformation += Math.cos(angle * 2.0 - timeFactor * 0.8) * 6 * s;
            }
            
            const r = layerRadius + deformation;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          ctx.closePath();
          
          // Generate glassmorphic liquid gradients
          const gradient = ctx.createRadialGradient(
            centerX - layerRadius * 0.2,
            centerY - layerRadius * 0.2,
            layerRadius * 0.05,
            centerX,
            centerY,
            layerRadius * 1.2
          );
          
          // Theme-based coloring transitions
          const primaryColor = colors.primary.replace("1)", `${layerOpacity})`);
          const secondaryColor = colors.secondary.replace("0.85)", `${layerOpacity * 0.6})`);
          const glowColor = colors.glow.replace("0.7)", `${layerOpacity * 0.2})`);
          
          gradient.addColorStop(0, "rgba(255, 255, 255, " + (layerOpacity * 0.9) + ")");
          gradient.addColorStop(0.2, primaryColor);
          gradient.addColorStop(0.7, secondaryColor);
          gradient.addColorStop(1, glowColor);
          
          ctx.fillStyle = gradient;
          ctx.shadowBlur = (25 + l * 15) * s;
          ctx.shadowColor = colors.primary.replace("1)", "0.55)");
          ctx.fill();
        }
      };

      const isThinkingState = characterState === "thinking" || state === "connecting";
      const isTalkingState = characterState === "talking" || state === "speaking";

      // Draw the ambient core shadow & outer liquid mask
      drawLiquidBlob(
        targetCenterX,
        targetCenterY,
        140 * s,
        3,
        1.1,
        5,
        0.35,
        isThinkingState,
        isTalkingState
      );
      
      // Draw the core glowing liquid sphere (Layer 2)
      drawLiquidBlob(
        targetCenterX,
        targetCenterY,
        90 * s,
        2,
        1.6,
        7,
        0.8,
        isThinkingState,
        isTalkingState
      );

      ctx.restore();

      // ==========================================
      // 4. DRAW GENTLE ORBITING FLUID DROPLETS
      // ==========================================
      ctx.save();
      const particleCount = 12;
      for (let i = 0; i < particleCount; i++) {
        const orbitAngle = (systemTime * 0.0004) + (i * (Math.PI * 2) / particleCount);
        const orbitRadius = (165 + Math.sin(systemTime * 0.002 + i) * 15) * s * (1 + speechVolumeRef.current * 0.4);
        
        const px = targetCenterX + Math.cos(orbitAngle) * orbitRadius;
        const py = targetCenterY + Math.sin(orbitAngle) * orbitRadius;
        
        // Fluid droplet morphing size
        const pSize = (3 + Math.sin(systemTime * 0.003 + i) * 1.5) * s;
        
        const dropletGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize);
        dropletGrad.addColorStop(0, "rgba(255,255,255,0.85)");
        dropletGrad.addColorStop(0.5, colors.colors[i % colors.colors.length]);
        dropletGrad.addColorStop(1, "rgba(255,255,255,0)");
        
        ctx.fillStyle = dropletGrad;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ==========================================
      // 5. DRAW COLORFUL LIQUID CURSOR TRAIL
      // ==========================================
      ctx.save();
      
      // Age and filter trail points
      trailRef.current = trailRef.current
        .map((p) => ({ ...p, age: p.age + 1 }))
        .filter((p) => p.age < p.maxAge);

      const trail = trailRef.current;
      if (trail.length > 2) {
        const leftPoints: Array<{ x: number; y: number }> = [];
        const rightPoints: Array<{ x: number; y: number }> = [];

        // ── PASS 1: CONSTRUCT AND FILL SMOOTH OUTER FLUID ENVELOPE ──
        for (let i = 0; i < trail.length; i++) {
          const p = trail[i];
          const ratio = i / (trail.length - 1); // 0 (tail) to 1 (head/cursor)
          const ageRatio = p.age / p.maxAge;

          // Liquid radius: thin at tail, thick in mid-tail, forming a bulb at the head
          const R_i = ((Math.sin(ratio * Math.PI * 0.8) * 26 + ratio * 12) * (1 - ageRatio) * s) + 2.5;

          // Determine direction normal vector for boundary offsets
          const prev = trail[Math.max(0, i - 1)];
          const next = trail[Math.min(trail.length - 1, i + 1)];
          
          let dx = next.x - prev.x;
          let dy = next.y - prev.y;
          if (i === 0) {
            dx = trail[1].x - trail[0].x;
            dy = trail[1].y - trail[0].y;
          } else if (i === trail.length - 1) {
            dx = trail[trail.length - 1].x - trail[trail.length - 2].x;
            dy = trail[trail.length - 1].y - trail[trail.length - 2].y;
          }

          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          // Add a subtle wave wobble along the boundary to simulate viscous ripples
          const wobble = Math.sin(ratio * 4.5 - systemTime * 0.022) * 5 * s * (1 - ageRatio);

          leftPoints.push({
            x: p.x + nx * (R_i + wobble),
            y: p.y + ny * (R_i + wobble),
          });
          rightPoints.push({
            x: p.x - nx * (R_i - wobble),
            y: p.y - ny * (R_i - wobble),
          });
        }

        // Draw outer glowing liquid body polygon path
        ctx.beginPath();
        ctx.moveTo(leftPoints[0].x, leftPoints[0].y);
        for (let i = 1; i < leftPoints.length; i++) {
          ctx.lineTo(leftPoints[i].x, leftPoints[i].y);
        }
        for (let i = rightPoints.length - 1; i >= 0; i--) {
          ctx.lineTo(rightPoints[i].x, rightPoints[i].y);
        }
        ctx.closePath();

        // Create linear gradient from tail to head
        const head = trail[trail.length - 1];
        const tailPoint = trail[0];
        const grad = ctx.createLinearGradient(tailPoint.x, tailPoint.y, head.x, head.y);
        
        // Add color stops matching the comet: transparent green (tail) -> yellow -> orange -> red -> pink -> white (head)
        grad.addColorStop(0, "rgba(5, 150, 105, 0)"); // transparent green tail
        grad.addColorStop(0.15, "rgba(16, 185, 129, 0.15)"); // green/emerald
        grad.addColorStop(0.35, "rgba(234, 179, 8, 0.35)"); // yellow/gold
        grad.addColorStop(0.6, "rgba(249, 115, 22, 0.65)"); // orange
        grad.addColorStop(0.8, "rgba(244, 63, 94, 0.85)"); // rose/red
        grad.addColorStop(0.95, "rgba(236, 72, 153, 0.95)"); // pink/magenta
        grad.addColorStop(1, "rgba(255, 255, 255, 1)"); // white head

        ctx.fillStyle = grad;
        ctx.shadowBlur = 35 * s;
        ctx.shadowColor = colors.primary; // glow match theme color
        ctx.fill();

        // ── PASS 2: CONSTRUCT AND DRAW INNER WHITE-HOT LIQUID CORE ──
        const leftCore: Array<{ x: number; y: number }> = [];
        const rightCore: Array<{ x: number; y: number }> = [];

        for (let i = 0; i < trail.length; i++) {
          const p = trail[i];
          const ratio = i / (trail.length - 1);
          const ageRatio = p.age / p.maxAge;

          // Core is thin and only visible near the head (ratio > 0.45)
          const coreVisible = ratio > 0.45 ? (ratio - 0.45) / 0.55 : 0;
          const R_core = 8 * coreVisible * (1 - ageRatio) * s;

          const prev = trail[Math.max(0, i - 1)];
          const next = trail[Math.min(trail.length - 1, i + 1)];
          
          let dx = next.x - prev.x;
          let dy = next.y - prev.y;
          if (i === 0) {
            dx = trail[1].x - trail[0].x;
            dy = trail[1].y - trail[0].y;
          } else if (i === trail.length - 1) {
            dx = trail[trail.length - 1].x - trail[trail.length - 2].x;
            dy = trail[trail.length - 1].y - trail[trail.length - 2].y;
          }

          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          leftCore.push({ x: p.x + nx * R_core, y: p.y + ny * R_core });
          rightCore.push({ x: p.x - nx * R_core, y: p.y - ny * R_core });
        }

        ctx.beginPath();
        ctx.moveTo(leftCore[0].x, leftCore[0].y);
        for (let i = 1; i < leftCore.length; i++) {
          ctx.lineTo(leftCore[i].x, leftCore[i].y);
        }
        for (let i = rightCore.length - 1; i >= 0; i--) {
          ctx.lineTo(rightCore[i].x, rightCore[i].y);
        }
        ctx.closePath();

        const coreGrad = ctx.createLinearGradient(tailPoint.x, tailPoint.y, head.x, head.y);
        coreGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
        coreGrad.addColorStop(0.5, "rgba(255, 255, 255, 0)");
        coreGrad.addColorStop(0.8, "rgba(236, 72, 153, 0.45)"); // pink
        coreGrad.addColorStop(1, "rgba(255, 255, 255, 0.95)"); // hot white

        ctx.fillStyle = coreGrad;
        ctx.shadowBlur = 12 * s;
        ctx.shadowColor = "#ffffff";
        ctx.fill();
      }

      ctx.restore();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [session, state, themeColor, activeEmotion, characterState]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Behind Overlay / Atmospheric Backlight Glow */}
      <div className="absolute inset-0 bg-transparent flex items-center justify-center pointer-events-none z-0">
        <div className={`w-[520px] h-[520px] rounded-full blur-[140px] opacity-35 bg-gradient-to-tr transition-all duration-1000 ${
          themeColor === "violet" ? "from-purple-600/40 to-fuchsia-600/10" :
          themeColor === "crimson" ? "from-rose-600/40 to-orange-600/10" :
          themeColor === "emerald" ? "from-emerald-600/40 to-teal-600/10" :
          themeColor === "celestial" ? "from-sky-600/40 to-cyan-600/10" :
          themeColor === "gold" ? "from-amber-600/40 to-yellow-600/10" :
          themeColor === "rose" ? "from-rose-600/40 to-pink-600/10" :
          "from-indigo-600/45 to-cyan-600/10"
        }`} />
      </div>

      {/* Main Holographic Canvas Visualizer */}
      <canvas
        id="arlak-hologram-living-canvas"
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />
    </div>
  );
};
