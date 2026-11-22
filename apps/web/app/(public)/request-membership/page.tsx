"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

function RequestMembershipForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [libraries, setLibraries] = useState<PublicLibrary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [loadingLibraries, setLoadingLibraries] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [memberType, setMemberType] = useState("STUDENT");
  const [organization, setOrganization] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailDispatched, setEmailDispatched] = useState(true);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLibraries() {
      try {
        const res = await fetch("/api/public/libraries");
        if (res.ok) {
          const data: PublicLibrary[] = await res.json();
          setLibraries(data);

          if (data.length > 0) {
            const queryTarget =
              searchParams?.get("library") ||
              searchParams?.get("slug") ||
              "";
            const match = data.find(
              (lib) =>
                lib.slug.toLowerCase() === queryTarget.toLowerCase() ||
                lib.libraryCode.toLowerCase() === queryTarget.toLowerCase(),
            );
            setSelectedSlug(match ? match.slug : data[0].slug);
          }
        }
      } catch {
        // Fallback default
        setSelectedSlug("city-lib");
      } finally {
        setLoadingLibraries(false);
      }
    }
    loadLibraries();
  }, [searchParams]);

  const selectedLibrary = libraries.find(
    (lib) => lib.slug === selectedSlug || lib.libraryCode.toLowerCase() === selectedSlug,
  );
  const libraryName = selectedLibrary?.name || "Library";
  const libraryCode = selectedLibrary?.libraryCode || "";

  const handleLibraryChange = (slug: string) => {
    setSelectedSlug(slug);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSlug) {
      setError("Please select the library branch you wish to apply to.");
      return;
    }

    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setError(
        "Please complete all required fields: Full Name, Phone Number, and Email Address.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/public/libraries/${selectedSlug}/membership-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            idNumber: idNumber.trim() || undefined,
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
          : "Failed to submit membership request. Please try again or visit the library front desk.",
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
          {libraryCode && <span>&bull; {libraryCode}</span>}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {libraryName}
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Submit your contact details to request a library membership at{" "}
          <strong className="text-foreground">{libraryName}</strong>. Library
          accounts are reviewed and provisioned by authorized library staff.
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
                Status: Pending Staff Review &bull; {libraryName}
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
                  enquiry was stored for {libraryName} staff review.
                </p>
              )}
            </div>

            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground text-left">
              <strong>Notice:</strong> This confirms receipt of your enquiry only;
              it does not constitute membership approval. Please visit{" "}
              {libraryName}&apos;s front desk with your national identification
              to complete your registration.
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              {selectedSlug && (
                <Link href={`/libraries/${selectedSlug}/catalogue`}>
                  <Button variant="primary">Browse {libraryName} Catalogue</Button>
                </Link>
              )}
              <Link href="/">
                <Button variant="outline">Return to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Membership Application Form</CardTitle>
            <CardDescription>
              Protected under the Kenya Data Protection Act 2019. We collect your
              details strictly to process your library membership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Library Selection Dropdown */}
              <div className="p-3.5 rounded-lg border border-primary/20 bg-forest-50/40 dark:bg-forest-900/10 space-y-1.5">
                <Select
                  label="Select Library Branch *"
                  id="library-selector"
                  value={selectedSlug}
                  onChange={(e) => handleLibraryChange(e.target.value)}
                  disabled={loadingLibraries || isSubmitting}
                  helperText="Choose the specific library you wish to join. Enquiries are sent directly to that library's review desk."
                  options={libraries.map((lib) => ({
                    value: lib.slug,
                    label: `${lib.name} [${lib.libraryCode}]`,
                  }))}
                  required
                />
              </div>

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
                <Input
                  label="National ID / Student ID (Optional)"
                  placeholder="e.g. 12345678"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
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
              </div>

              <Input
                label="School / Department / Organization (Optional)"
                placeholder="e.g. Nairobi Technical Institute or Local Resident"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Statement of Study Interests or Research Topics (Optional)
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
                {selectedSlug ? (
                  <Link
                    href={`/libraries/${selectedSlug}/catalogue`}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    &larr; View Library Catalogue
                  </Link>
                ) : (
                  <Link
                    href="/"
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    &larr; Return Home
                  </Link>
                )}
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

export default function RequestMembershipPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 max-w-2xl mx-auto text-center text-sm text-muted-foreground">
          Loading membership enquiry form...
        </div>
      }
    >
      <RequestMembershipForm />
    </Suspense>
  );
}
