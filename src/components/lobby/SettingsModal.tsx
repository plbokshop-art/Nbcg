import React, { useState } from 'react';
import { soundEngine } from '../../utils/audio.js';

interface Props {
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ onClose }) => {
  const [volume, setVolume] = useState<number>(80);
  const [sensitivity, setSensitivity] = useState<number>(2.2);
  const [fov, setFov] = useState<number>(75);
  const [crosshairColor, setCrosshairColor] = useState<string>('#00f0ff');

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    soundEngine.setVolume(v / 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h2 className="text-xl font-black text-white tracking-wider uppercase">TACTICAL SETTINGS</h2>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 font-mono text-xs">
          {/* Master Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-slate-300">MASTER AUDIO VOLUME</span>
              <span className="text-cyan-400 font-bold">{volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Mouse Sensitivity */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-slate-300">AIM SENSITIVITY</span>
              <span className="text-cyan-400 font-bold">{sensitivity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Field of View */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-slate-300">FIELD OF VIEW (FOV)</span>
              <span className="text-cyan-400 font-bold">{fov}°</span>
            </div>
            <input
              type="range"
              min="65"
              max="105"
              value={fov}
              onChange={(e) => setFov(Number(e.target.value))}
              className="accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Crosshair Color */}
          <div className="flex justify-between items-center border-t border-slate-800/80 pt-3">
            <span className="text-slate-300">CROSSHAIR RETICLE COLOR</span>
            <div className="flex items-center gap-2">
              {['#00f0ff', '#00ff88', '#ff3344', '#ffff00', '#ffffff'].map((color) => (
                <button
                  key={color}
                  onClick={() => setCrosshairColor(color)}
                  style={{ backgroundColor: color }}
                  className={`h-5 w-5 rounded-full transition-transform ${
                    crosshairColor === color ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-mono font-bold uppercase transition"
          >
            APPLY & SAVE
          </button>
        </div>
      </div>
    </div>
  );
};
