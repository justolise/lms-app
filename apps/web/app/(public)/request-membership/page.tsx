"use client";

import Link from "next/link";
import { useState } from "react";
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

export default function RequestMembershipPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [memberType, setMemberType] = useState("STUDENT");
  const [organization, setOrganization] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !phone.trim() || !idNumber.trim()) {
      setError(
        "Please complete all required fields (Full Name, Phone, and National ID/Student Number).",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const libraryCode = process.env.NEXT_PUBLIC_LIBRARY_CODE ?? "TEST-LIB";
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

      const res = await fetch(`${apiBase}/public/membership-enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryCode,
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim(),
          idNumber: idNumber.trim(),
          memberType: memberType || undefined,
          organization: organization.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.message ??
            "Failed to submit membership request. Please try again or visit the library front desk.",
        );
      }

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
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Membership Request Enquiry
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Commonplace Library System accounts are verified and provisioned by
          library staff. Submit your contact details below to apply for a
          library card.
        </p>
      </div>

      {isSuccess ? (
        <Card className="border-forest-500/30 bg-forest-50/50 dark:bg-forest-900/20">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 dark:bg-forest-800 text-primary">
              <svg
                className="h-8 w-8"
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
            <h2 className="text-xl font-bold text-foreground">
              Application Received
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Thank you, <strong className="text-foreground">{fullName}</strong>
              . Your membership enquiry has been submitted. A librarian will
              review your identification and contact you at{" "}
              <strong className="text-foreground">{phone}</strong> with your
              login credentials and card pickup details.
            </p>
            <div className="pt-4 flex justify-center gap-3">
              <Link href="/">
                <Button variant="outline">Return to Home</Button>
              </Link>
              <Link href="/browse">
                <Button>Browse Catalogue</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Patron Contact Information</CardTitle>
            <CardDescription>
              All applications are protected under the Kenya Data Protection Act
              2019.
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
                  label="Email Address"
                  type="email"
                  placeholder="e.g. amani@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  label="National ID / Student ID / Passport *"
                  placeholder="e.g. 12345678"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  required
                />
                <Select
                  label="Preferred Member Type *"
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
                label="School / Institution / Department"
                placeholder="e.g. Nairobi Technical Institute"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Statement of Purpose or Research Interests
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
                  placeholder="Briefly state your reading or study interests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Cancel
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
