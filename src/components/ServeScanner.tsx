"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import jsQR from "jsqr";
import { scanTicketAction, serveTicketAction } from "@/app/actions/serving";

type Preview = Record<string, string>;

export function ServeScanner({
  branches,
  initialBranchId,
}: {
  branches: { id: string; nameFa: string }[];
  initialBranchId: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [manual, setManual] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    const startCam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tick = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState >= 2) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(img.data, img.width, img.height);
              if (code?.data) {
                start(async () => {
                  const r = await scanTicketAction(code.data, branchId);
                  if (r.error) setError(r.error);
                  if (r.preview) {
                    setPreview(r.preview);
                    setError(null);
                    setOk(null);
                  }
                });
              }
            }
          }
          timer = window.setTimeout(tick, 400);
        };
        tick();
      } catch {
        /* camera optional */
      }
    };
    startCam();
    return () => {
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [branchId]);

  function lookup() {
    start(async () => {
      setOk(null);
      const r = await scanTicketAction(manual, branchId);
      setError(r.error ?? null);
      setPreview(r.preview ?? null);
    });
  }

  function serve() {
    if (!preview?.token) return;
    start(async () => {
      const r = await serveTicketAction(preview.token, branchId);
      if (r.error) setError(r.error);
      if (r.ok) {
        setOk("غذا با موفقیت تحویل شد.");
        setPreview(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        شعبه تحویل
        <select
          className="field mt-1"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nameFa}
            </option>
          ))}
        </select>
      </label>
      <video ref={videoRef} className="w-full rounded-2xl bg-black" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex gap-2">
        <input
          className="field"
          placeholder="یا کد بلیت را وارد کنید"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button className="btn btn-ghost" type="button" onClick={lookup} disabled={pending}>
          بررسی
        </button>
      </div>
      {error && (
        <p className="rounded-2xl bg-red-50 p-4 text-lg font-bold text-danger">{error}</p>
      )}
      {ok && <p className="rounded-2xl bg-green-50 p-4 text-lg font-bold text-ok">{ok}</p>}
      {preview && (
        <div className="card space-y-2 p-5 text-center">
          {preview.photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/files/${preview.photoPath}`}
              alt=""
              className="mx-auto h-28 w-28 rounded-full object-cover"
            />
          ) : (
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-stone-200">
              بدون عکس
            </div>
          )}
          <p className="text-2xl font-bold">{preview.userName}</p>
          <p className="text-muted">{preview.employeeId}</p>
          <p>{preview.date}</p>
          <p>{preview.mealLabel}</p>
          <p className="text-xl font-bold">{preview.foodTitle}</p>
          <p className="text-sm">شعبه: {preview.branchName}</p>
          <button
            className="btn btn-primary mt-2 w-full py-4 text-xl"
            type="button"
            disabled={pending}
            onClick={serve}
          >
            تحویل غذا
          </button>
        </div>
      )}
    </div>
  );
}
