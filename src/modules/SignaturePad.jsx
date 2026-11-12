import React, { useEffect, useRef, useState } from "react";

export default function SignaturePad({ onSignatureChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
  }, []);

  const getPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (event.clientY - rect.top) * (canvasRef.current.height / rect.height)
    };
  };

  const start = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const point = getPoint(event);
    drawingRef.current = true;
    canvas.setPointerCapture?.(event.pointerId);
    const context = canvas.getContext("2d");
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const move = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const point = getPoint(event);
    const context = canvasRef.current.getContext("2d");
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasInk(true);
  };

  const finish = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current.toBlob((blob) => {
      if (blob) onSignatureChange?.(new File([blob], "partner-signature.png", { type: "image/png" }));
    }, "image/png");
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onSignatureChange?.(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={900}
        height={220}
        aria-label="Draw your signature here"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        className="block w-full h-28 bg-white rounded-xl border-2 border-dashed border-slate-500 touch-none"
      />
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{hasInk ? "Signature captured on this device" : "Draw with your finger, stylus, or mouse"}</span>
        <button type="button" onClick={clear} className="px-2 py-1 rounded-lg bg-slate-800 text-white">Clear signature</button>
      </div>
    </div>
  );
}
