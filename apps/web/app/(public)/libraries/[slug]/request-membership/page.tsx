"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface PublicLibrary {
  id: string;
  name: string;
  slug: string;
  libraryCode: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3000";

function MembershipRequestForm() {
  const params = useParams();
  const slug = (params?.slug as string) || "test-lib";

  const [library, setLibrary] = useState<PublicLibrary | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [memberType, setMemberType] = useState("STUDENT");
  const [organization, setOrganization] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailDispatched, setEmailDispatched] = useState(true);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLibrary() {
      try {
        const res = await fetch(`${API_BASE}/public/libraries/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setLibrary(data);
        }
      } catch {
        // Fallback silently
      }
    }
    loadLibrary();
  }, [slug]);

  const libraryName = library?.name || "Library";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError(
        "Please complete all required fields: Full Legal Name, Email Address, and Phone Number.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/public/libraries/${slug}/membership-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            memberType: memberType || undefined,
            organization: organization.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message ??
            "Failed to submit membership request. Please try again or visit the library front desk.",
        );
      }

      setEmailDispatched(Boolean(data?.emailDispatched ?? true));
      setConfirmationMessage(
        data?.message ??
          `Your membership enquiry has been received by ${libraryName}.`,
      );
      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit membership request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full">
      {/* Header Banner */}
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-50 dark:bg-forest-900/40 text-primary text-xs font-semibold">
          <span>Membership Enquiry</span>
          {library?.libraryCode && <span>&bull; {library.libraryCode}</span>}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {libraryName}
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          You are submitting a membership enquiry to{" "}
          <strong className="text-foreground">{libraryName}</strong>. Library
          accounts are verified and provisioned in person by authorized library
          staff.
        </p>
      </div>

      {isSuccess ? (
        <Card className="border-forest-500/30 bg-forest-50/40 dark:bg-forest-900/20 shadow-sm">
          <CardContent className="p-8 text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest-100 dark:bg-forest-800 text-primary">
              <svg
                className="h-9 w-9"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">
                Enquiry Successfully Received
              </h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Status: Pending Staff Review
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface text-left space-y-2 text-xs">
              <p className="text-foreground">
                Thank you, <strong>{fullName}</strong>.
              </p>
              <p className="text-muted-foreground">{confirmationMessage}</p>
              {emailDispatched ? (
                <div className="flex items-center gap-2 text-forest-700 dark:text-forest-300 font-medium pt-1">
                  <svg
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>
                    A confirmation email has been dispatched to{" "}
                    <strong>{email}</strong>.
                  </span>
                </div>
              ) : (
                <p className="text-amber-700 dark:text-amber-400">
                  Note: Email confirmation delivery was skipped, but your
                  enquiry was successfully stored for staff review.
                </p>
              )}
            </div>

            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground text-left">
              <strong>Notice:</strong> This email and screen confirm receipt of
              your inquiry only; it does not constitute membership approval.
              When ready, visit the front desk with your national identification
              card to finalize your card pickup.
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link href={`/libraries/${slug}/catalogue`}>
                <Button variant="primary">Browse Library Catalogue</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Return to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Patron Contact Information</CardTitle>
            <CardDescription>
              Protected under the Kenya Data Protection Act 2019. We collect
              your contact information strictly to review your library enquiry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Legal Name *"
                placeholder="e.g. Amani Mwangi"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Address *"
                  type="email"
                  placeholder="e.g. amani@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Phone Number *"
                  placeholder="e.g. +254 712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Preferred Member Category *"
                  value={memberType}
                  onChange={(e) => setMemberType(e.target.value)}
                  options={[
                    { value: "STUDENT", label: "Student Patron" },
                    { value: "TEACHER", label: "Teacher / Faculty" },
                    { value: "COMMUNITY", label: "Community / General Public" },
                  ]}
                />
                <Input
                  label="Institution / Department (Optional)"
                  placeholder="e.g. Technical Institute"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Statement of Study Interests or Research Topics
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
                  placeholder="Briefly state your study, reading, or research interests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-border">
                <Link
                  href={`/libraries/${slug}/catalogue`}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  &larr; Back to Catalogue
                </Link>
                <Button type="submit" isLoading={isSubmitting} size="lg">
                  Submit Membership Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function TenantPublicMembershipRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 px-4 text-center text-sm text-muted-foreground">
          Loading membership enquiry form...
        </div>
      }
    >
      <MembershipRequestForm />
    </Suspense>
  );
}
