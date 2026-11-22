"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/features/auth/services/auth.service";
import type { UserSession } from "@/features/auth/types/auth.types";
import { formatDate } from "@/utils/date";

export function SessionsList() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadSessions() {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.listSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function handleRevoke(sessionId: string) {
    setRevokingId(sessionId);
    setError(null);
    setMessage(null);
    try {
      await authService.revokeSession(sessionId);
      setMessage("Device session revoked successfully.");
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold text-foreground">
          Active Devices &amp; Sessions
        </h3>
        <p className="text-xs text-muted-foreground">
          View active browser sessions logged into your account and revoke
          unfamiliar devices.
        </p>
      </div>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="py-8 flex justify-center">
          <Spinner size="md" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
          No other active sessions detected.
        </div>
      ) : (
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface-raised/40">
          {sessions.map((s, idx) => (
            <div
              key={s.id}
              className="p-3.5 flex items-center justify-between text-xs gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {s.deviceName || "Web Browser"}
                  </span>
                  {idx === 0 && <Badge variant="success">Current Device</Badge>}
                </div>
                <div className="text-[11px] text-muted-foreground flex gap-3">
                  <span>Signed in: {formatDate(s.createdAt, true)}</span>
                  <span>Expires: {formatDate(s.expiresAt)}</span>
                </div>
              </div>

              {idx !== 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  isLoading={revokingId === s.id}
                  onClick={() => handleRevoke(s.id)}
                  className="text-danger hover:text-danger hover:bg-danger/10"
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
