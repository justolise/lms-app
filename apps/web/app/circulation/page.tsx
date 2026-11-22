"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Loan {
  id: string;
  userId: string;
  copyId: string;
  catalogueItemId: string;
  status: string;
  checkedOutAt: string;
  dueAt: string;
  returnedAt: string | null;
  renewalCount: number;
  maxRenewals: number;
  fineMinorUnits: number | null;
}

type Tab = "checkout" | "return" | "renew";

// ─── Barcode Scanner (CIR-6) using zxing-wasm ────────────────────────────────

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  label?: string;
}

function BarcodeScanner({
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
      // Dynamically import zxing-wasm to avoid SSR issues
      const { readBarcodesFromImageData, setZXingModuleOverrides } =
        await import("zxing-wasm/reader");

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

  // Cleanup on unmount
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
      {/* Camera viewfinder */}
      {scanning && (
        <div className="relative rounded-lg overflow-hidden border-2 border-blue-500 bg-black">
          {/* biome-ignore lint/a11y/useMediaCaption: live camera preview */}
          <video
            ref={videoRef}
            className="w-full max-h-56 object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-x-0 bottom-0 flex justify-center p-2">
            <button
              type="button"
              onClick={stopScanner}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            >
              Stop Scanner
            </button>
          </div>
        </div>
      )}
      {!scanning && <div ref={videoRef as never} className="hidden" />}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera error */}
      {cameraError && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Camera unavailable: {cameraError}. Use manual entry below.
        </p>
      )}

      {/* Camera toggle button */}
      {!scanning && (
        <button
          type="button"
          onClick={startScanner}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <span>📷</span> {label}
        </button>
      )}

      {/* Manual barcode entry — div with key/click handling to avoid nested forms */}
      <div className="flex gap-2">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleManualSubmit();
            }
          }}
          placeholder="Or enter barcode manually…"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleManualSubmit}
          disabled={!manualInput.trim()}
          className="px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Use
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CirculationPage() {
  const [activeTab, setActiveTab] = useState<Tab>("checkout");

  // ── Checkout state
  const [checkoutMemberId, setCheckoutMemberId] = useState("");
  const [checkoutBarcode, setCheckoutBarcode] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<Loan | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // ── Return state
  const [returnBarcode, setReturnBarcode] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnResult, setReturnResult] = useState<{
    loan: Loan;
    overdueDays: number;
    fineMinorUnits: number;
    fineKes: number;
  } | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  // ── Renew state (from active loans list)
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [loansError, setLoansError] = useState<string | null>(null);
  const [renewLoanId, setRenewLoanId] = useState("");
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewResult, setRenewResult] = useState<Loan | null>(null);
  const [renewError, setRenewError] = useState<string | null>(null);

  // Load active loans when renew tab is opened
  useEffect(() => {
    if (activeTab !== "renew") return;
    setLoansLoading(true);
    setLoansError(null);
    fetch("/api/circulation/loans?status=ACTIVE", { credentials: "include" })
      .then((r) => r.json())
      .then((data: Loan[]) => {
        setMyLoans(Array.isArray(data) ? data : []);
        setLoansLoading(false);
      })
      .catch(() => {
        setLoansError("Failed to load loans");
        setLoansLoading(false);
      });
  }, [activeTab]);

  // ── Checkout handler
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutBarcode || !checkoutMemberId) return;
    setCheckoutLoading(true);
    setCheckoutResult(null);
    setCheckoutError(null);

    const body: Record<string, string> = {
      barcode: checkoutBarcode,
      memberIdentifier: checkoutMemberId,
    };
    if (overrideReason) body.overrideReason = overrideReason;

    try {
      const res = await fetch("/api/circulation/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Checkout failed" }));
        setCheckoutError(err.message ?? "Checkout failed");
      } else {
        setCheckoutResult(await res.json());
        setCheckoutBarcode("");
        setOverrideReason("");
      }
    } catch {
      setCheckoutError("Network error during checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ── Return handler
  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnBarcode) return;
    setReturnLoading(true);
    setReturnResult(null);
    setReturnError(null);

    try {
      const res = await fetch("/api/circulation/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ barcode: returnBarcode }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Return failed" }));
        setReturnError(err.message ?? "Return failed");
      } else {
        setReturnResult(await res.json());
        setReturnBarcode("");
      }
    } catch {
      setReturnError("Network error during return");
    } finally {
      setReturnLoading(false);
    }
  };

  // ── Renew handler
  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewLoanId) return;
    setRenewLoading(true);
    setRenewResult(null);
    setRenewError(null);

    try {
      const res = await fetch(`/api/circulation/renew/${renewLoanId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Renewal failed" }));
        setRenewError(err.message ?? "Renewal failed");
      } else {
        setRenewResult(await res.json());
        // Refresh list
        setMyLoans((prev) =>
          prev.map((l) =>
            l.id === renewLoanId ? { ...l, ...renewResult! } : l,
          ),
        );
      }
    } catch {
      setRenewError("Network error during renewal");
    } finally {
      setRenewLoading(false);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-KE", {
      timeZone: "Africa/Nairobi",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const tabs: { id: Tab; label: string }[] = [
    { id: "checkout", label: "✅ Checkout" },
    { id: "return", label: "↩ Return" },
    { id: "renew", label: "🔄 Renew" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Circulation Desk</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Tab selector */}
        <div className="flex border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CHECKOUT TAB ───────────────────────────────────────── */}
        {activeTab === "checkout" && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">
              Check Out a Copy
            </h2>

            <form onSubmit={handleCheckout} className="space-y-4">
              {/* Member identifier */}
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="memberId"
                >
                  Member (ID / email / admission no.)
                </label>
                <input
                  id="memberId"
                  type="text"
                  value={checkoutMemberId}
                  onChange={(e) => setCheckoutMemberId(e.target.value)}
                  placeholder="e.g. ADM-2024-001 or jane@school.ac.ke"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Barcode scanner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Copy Barcode
                </label>
                <BarcodeScanner
                  onDetected={(code) => setCheckoutBarcode(code)}
                  label="Scan Copy Barcode"
                />
                {checkoutBarcode && (
                  <p className="mt-1 text-sm text-green-700 font-mono bg-green-50 border border-green-200 rounded px-2 py-1">
                    Scanned: {checkoutBarcode}
                  </p>
                )}
              </div>

              {/* Optional override reason */}
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="override"
                >
                  Override Reason{" "}
                  <span className="text-gray-400 font-normal">
                    (if bypassing a soft block)
                  </span>
                </label>
                <input
                  id="override"
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Approved by head librarian"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {checkoutError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {checkoutError}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  checkoutLoading || !checkoutBarcode || !checkoutMemberId
                }
                className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {checkoutLoading ? "Processing…" : "Check Out"}
              </button>
            </form>

            {/* Result */}
            {checkoutResult && (
              <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-green-800">
                  ✓ Checked out successfully
                </p>
                <p className="text-sm text-green-700">
                  Due: <strong>{fmtDate(checkoutResult.dueAt)}</strong>
                </p>
                <p className="text-xs text-green-600 font-mono">
                  Loan ID: {checkoutResult.id}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── RETURN TAB ─────────────────────────────────────────── */}
        {activeTab === "return" && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">
              Return a Copy
            </h2>

            <form onSubmit={handleReturn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Copy Barcode
                </label>
                <BarcodeScanner
                  onDetected={(code) => setReturnBarcode(code)}
                  label="Scan Return Barcode"
                />
                {returnBarcode && (
                  <p className="mt-1 text-sm text-green-700 font-mono bg-green-50 border border-green-200 rounded px-2 py-1">
                    Scanned: {returnBarcode}
                  </p>
                )}
              </div>

              {returnError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {returnError}
                </div>
              )}

              <button
                type="submit"
                disabled={returnLoading || !returnBarcode}
                className="w-full py-2.5 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {returnLoading ? "Processing…" : "Return Copy"}
              </button>
            </form>

            {returnResult && (
              <div
                className={`rounded-md border px-4 py-3 space-y-1 ${
                  returnResult.overdueDays > 0
                    ? "bg-amber-50 border-amber-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    returnResult.overdueDays > 0
                      ? "text-amber-800"
                      : "text-green-800"
                  }`}
                >
                  {returnResult.overdueDays > 0
                    ? `⚠ Returned ${returnResult.overdueDays} day(s) late`
                    : "✓ Returned on time"}
                </p>
                {returnResult.fineMinorUnits > 0 && (
                  <p className="text-sm text-amber-700">
                    Fine due:{" "}
                    <strong>KES {returnResult.fineKes.toFixed(2)}</strong>
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── RENEW TAB ──────────────────────────────────────────── */}
        {activeTab === "renew" && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">
              Renew a Loan
            </h2>
            <p className="text-sm text-gray-500">
              Select an active loan to renew. Only ADMIN/LIBRARIAN may renew
              loans.
            </p>

            {loansLoading && (
              <p className="text-sm text-gray-500 animate-pulse">
                Loading loans…
              </p>
            )}
            {loansError && <p className="text-sm text-red-600">{loansError}</p>}

            {!loansLoading && myLoans.length === 0 && (
              <p className="text-sm text-gray-500">No active loans found.</p>
            )}

            {!loansLoading && myLoans.length > 0 && (
              <form onSubmit={handleRenew} className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="loanSelect"
                  >
                    Select Loan
                  </label>
                  <select
                    id="loanSelect"
                    value={renewLoanId}
                    onChange={(e) => setRenewLoanId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">— choose a loan —</option>
                    {myLoans.map((loan) => (
                      <option key={loan.id} value={loan.id}>
                        Due {fmtDate(loan.dueAt)} · Renewal {loan.renewalCount}/
                        {loan.maxRenewals}
                      </option>
                    ))}
                  </select>
                </div>

                {renewError && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {renewError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={renewLoading || !renewLoanId}
                  className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {renewLoading ? "Renewing…" : "Renew Loan"}
                </button>
              </form>
            )}

            {renewResult && (
              <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-green-800">
                  ✓ Loan renewed
                </p>
                <p className="text-sm text-green-700">
                  New due date: <strong>{fmtDate(renewResult.dueAt)}</strong>
                </p>
                <p className="text-sm text-green-600">
                  Renewals used: {renewResult.renewalCount} /{" "}
                  {renewResult.maxRenewals}
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
