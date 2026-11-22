"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  label?: string;
}

export function BarcodeScanner({
  onDetected,
  label = "Scan Barcode",
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");

  const stopScanner = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setCameraError(null);
    try {
      const { readBarcodesFromImageData } = await import("zxing-wasm/reader");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setScanning(true);

      const scanFrame = async () => {
        if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const results = await readBarcodesFromImageData(imageData, {
          tryHarder: true,
          formats: [
            "QRCode",
            "Code128",
            "Code39",
            "EAN13",
            "EAN8",
            "DataMatrix",
          ],
        });

        if (results.length > 0 && results[0].text) {
          stopScanner();
          onDetected(results[0].text);
          return;
        }

        rafRef.current = requestAnimationFrame(scanFrame);
      };

      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera unavailable";
      setCameraError(msg);
    }
  }, [onDetected, stopScanner]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  const handleManualSubmit = () => {
    const val = manualInput.trim();
    if (val) {
      setManualInput("");
      onDetected(val);
    }
  };

  return (
    <div className="space-y-3">
      {scanning && (
        <div className="relative rounded-xl overflow-hidden border-2 border-primary bg-black">
          <video
            ref={videoRef}
            className="w-full max-h-56 object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-x-0 bottom-0 flex justify-center p-2 bg-gradient-to-t from-black/80 to-transparent">
            <Button variant="danger" size="sm" onClick={stopScanner}>
              Stop Scanner
            </Button>
          </div>
        </div>
      )}
      {!scanning && <div ref={videoRef as never} className="hidden" />}
      <canvas ref={canvasRef} className="hidden" />

      {cameraError && (
        <Alert variant="warning" title="Camera Unavailable">
          {cameraError}. You can enter the barcode manually below.
        </Alert>
      )}

      {!scanning && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startScanner}
          leftIcon={<span className="text-base">📷</span>}
        >
          {label}
        </Button>
      )}

      {/* Manual entry — div with key/click handling to avoid nested forms */}
      <div className="flex gap-2">
        <Input
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleManualSubmit();
            }
          }}
          placeholder="Or enter barcode manually…"
          className="flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleManualSubmit}
          disabled={!manualInput.trim()}
        >
          Use
        </Button>
      </div>
    </div>
  );
}
