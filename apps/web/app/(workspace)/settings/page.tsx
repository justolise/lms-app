"use client";

import { Suspense, useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { adminService } from "@/features/admin/services/admin.service";
import type { LibraryProfile } from "@/features/admin/types/library-profile.types";
import { useAuth } from "@/lib/auth/auth-context";

const DEFAULT_HOURS_PRESET = `Monday - Friday: 8:00 AM - 6:00 PM
Saturday: 9:00 AM - 1:00 PM
Sunday & Public Holidays: Closed`;

export default function LibrarySettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <LibrarySettingsContent />
    </Suspense>
  );
}

function LibrarySettingsContent() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<LibraryProfile | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [borrowingRulesSummary, setBorrowingRulesSummary] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const data = await adminService.getProfile();
        setProfile(data);
        setName(data.name || "");
        setLogoUrl(data.logoUrl || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setOpeningHours(data.openingHours || "");
        setWebsite(data.website || "");
        setDescription(data.description || "");
        setBorrowingRulesSummary(data.borrowingRulesSummary || "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load library profile",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await adminService.updateProfile({
        name: name.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        openingHours: openingHours.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
        borrowingRulesSummary: borrowingRulesSummary.trim() || undefined,
      });

      setProfile(updated);
      setSuccess("Library profile and branding saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save library profile",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Library Profile & Branding
          </h1>
          <Badge variant="primary">ADM-1</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the public profile, contact info, operating schedule, and
          borrowing summary shown to patrons and visitors.
        </p>
      </div>

      {!isAdmin && (
        <Alert variant="info">
          You are viewing this configuration in read-only mode. Only users with
          the <strong>ADMIN</strong> role can modify library tenant profile
          settings.
        </Alert>
      )}

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Identity & Branding Card */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  1. Identity & Visual Branding
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground">
                      Library Name <span className="text-danger">*</span>
                    </label>
                    <Input
                      required
                      disabled={!isAdmin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Nairobi Central Community Library"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Library Code (Slug ID)
                    </label>
                    <Input
                      disabled
                      value={profile?.libraryCode || ""}
                      className="bg-muted font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Unique immutable tenant code
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Status
                    </label>
                    <div className="pt-2">
                      <Badge variant="success">{profile?.status}</Badge>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground">
                      Logo Image URL
                    </label>
                    <Input
                      type="url"
                      disabled={!isAdmin}
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.org/assets/library-logo.png"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Square or horizontal PNG/SVG image URL shown in portal and
                      public header
                    </p>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground">
                      Library Description / Mission
                    </label>
                    <textarea
                      disabled={!isAdmin}
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief summary of the library's mission and community focus..."
                      className="w-full text-xs rounded-lg border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact & Location Card */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  2. Contact & Physical Location
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Contact Email
                    </label>
                    <Input
                      type="email"
                      disabled={!isAdmin}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="helpdesk@library.org"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Contact Telephone
                    </label>
                    <Input
                      disabled={!isAdmin}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254 700 000 000"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground">
                      Physical Street Address / Campus
                    </label>
                    <Input
                      disabled={!isAdmin}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 4th Floor, City Square Building, Kenyatta Avenue"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground">
                      Official Website
                    </label>
                    <Input
                      type="url"
                      disabled={!isAdmin}
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://library.org"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operating Hours & Borrowing Summary Card */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  3. Operating Schedule & Public Borrowing Terms
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">
                        Opening Hours Schedule
                      </label>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setOpeningHours(DEFAULT_HOURS_PRESET)}
                          className="text-[11px] text-primary hover:underline cursor-pointer"
                        >
                          Use Standard Schedule Preset
                        </button>
                      )}
                    </div>
                    <textarea
                      disabled={!isAdmin}
                      rows={3}
                      value={openingHours}
                      onChange={(e) => setOpeningHours(e.target.value)}
                      placeholder="e.g. Mon-Fri: 8:00 AM - 6:00 PM&#10;Sat: 9:00 AM - 1:00 PM&#10;Sun: Closed"
                      className="w-full text-xs font-mono rounded-lg border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Public Borrowing Rules Summary
                    </label>
                    <textarea
                      disabled={!isAdmin}
                      rows={3}
                      value={borrowingRulesSummary}
                      onChange={(e) => setBorrowingRulesSummary(e.target.value)}
                      placeholder="Summary of loan limits, hold pickup window, and renewal policy shown on public catalogue..."
                      className="w-full text-xs rounded-lg border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <div className="flex justify-end gap-3 pt-2">
                <Button type="submit" size="md" isLoading={saving}>
                  Save Profile Settings
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* Live Patron Preview Card */}
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Patron Header Preview
          </div>

          <Card className="border border-border/80 shadow-sm overflow-hidden">
            <div className="bg-forest-900 text-white p-4">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  // biome-ignore lint/performance/noImgElement: User configurable preview logo
                  <img
                    src={logoUrl}
                    alt="Logo Preview"
                    className="h-12 w-12 object-contain rounded-lg bg-white/10 p-1 border border-white/20 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-lg shrink-0">
                    {name ? name[0].toUpperCase() : "L"}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm line-clamp-1">
                    {name || "Library Name"}
                  </h3>
                  <p className="text-[11px] text-white/80 font-mono">
                    [{profile?.libraryCode || "LIB-CODE"}]
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="p-4 text-xs space-y-3 bg-surface">
              {description && (
                <p className="text-muted-foreground line-clamp-2">
                  {description}
                </p>
              )}

              {/* Operating Hours Preview */}
              {openingHours && (
                <div className="bg-surface-raised p-2.5 rounded-lg border border-border/60 space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <span>🕒 Operating Hours</span>
                  </div>
                  <pre className="text-[11px] font-sans text-muted-foreground whitespace-pre-line">
                    {openingHours}
                  </pre>
                </div>
              )}

              {/* Contacts Preview */}
              <div className="space-y-1.5 pt-1 text-muted-foreground">
                {email && (
                  <div className="flex items-center gap-2">
                    <span>✉️</span>
                    <span className="truncate">{email}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-2">
                    <span>📞</span>
                    <span>{phone}</span>
                  </div>
                )}
                {address && (
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span className="line-clamp-1">{address}</span>
                  </div>
                )}
                {website && (
                  <div className="flex items-center gap-2">
                    <span>🌐</span>
                    <span className="truncate text-primary">{website}</span>
                  </div>
                )}
              </div>

              {/* Borrowing Rules Preview */}
              {borrowingRulesSummary && (
                <div className="mt-2 pt-2 border-t border-border/60">
                  <span className="font-semibold text-[11px] text-foreground block mb-0.5">
                    Borrowing Terms:
                  </span>
                  <p className="text-[11px] text-muted-foreground line-clamp-3">
                    {borrowingRulesSummary}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
