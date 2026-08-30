import React, { useEffect, useRef } from 'react';
import { voiceEngine } from '../services/voice';

interface LiveAudioWaveProps {
  isListening: boolean;
  status: string;
}

export const LiveAudioWave: React.FC<LiveAudioWaveProps> = ({ isListening, status }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const freqData = voiceEngine.getAudioFrequencyData();
      const numBars = 32;
      const barWidth = canvas.width / numBars - 2;

      for (let i = 0; i < numBars; i++) {
        let val = 8;
        if (isListening && freqData && freqData.length > i) {
          val = Math.max(6, (freqData[i] / 255) * canvas.height * 0.9);
        } else if (status === 'SPEAKING') {
          val = Math.max(6, Math.sin(Date.now() * 0.01 + i * 0.3) * (canvas.height * 0.4) + canvas.height * 0.45);
        } else if (status === 'THINKING') {
          val = Math.max(4, Math.sin(Date.now() * 0.02 + i * 0.5) * (canvas.height * 0.3) + canvas.height * 0.3);
        } else {
          // Idle gentle wave
          val = 4 + Math.sin(Date.now() * 0.003 + i * 0.4) * 3;
        }

        const x = i * (barWidth + 2);
        const y = (canvas.height - val) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + val);
        if (status === 'ERROR') {
          grad.addColorStop(0, '#f43f5e');
          grad.addColorStop(1, '#fda4af');
        } else if (status === 'EXECUTING') {
          grad.addColorStop(0, '#f59e0b');
          grad.addColorStop(1, '#06b6d4');
        } else {
          grad.addColorStop(0, '#06b6d4');
          grad.addColorStop(1, '#818cf8');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, val, 3);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isListening, status]);

  return (
    <div className="w-full flex items-center justify-center py-2">
      <canvas
        ref={canvasRef}
        width={320}
        height={48}
        className="w-80 h-12 opacity-90 transition-opacity"
      />
    </div>
  );
};
