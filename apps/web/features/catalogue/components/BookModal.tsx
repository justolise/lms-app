"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { catalogueService } from "../services/catalogue.service";
import {
  type CatalogueItem,
  type CategoryOption,
  type CreateCatalogueItemInput,
  ITEM_FORMATS,
} from "../types/catalogue.types";

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryOption[];
  editingItem?: CatalogueItem | null;
}

export function BookModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  editingItem,
}: BookModalProps) {
  const [isbnLookupInput, setIsbnLookupInput] = useState("");
  const [lookingUpIsbn, setLookingUpIsbn] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [isbn13, setIsbn13] = useState("");
  const [isbn10, setIsbn10] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishedYear, setPublishedYear] = useState<number | "">("");
  const [language, setLanguage] = useState("en");
  const [format, setFormat] = useState("BOOK");
  const [callNumber, setCallNumber] = useState("");
  const [shelfLocation, setShelfLocation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subjects, setSubjects] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title || "");
      setSubtitle(editingItem.subtitle || "");
      setAuthors(editingItem.authors ? editingItem.authors.join(", ") : "");
      setIsbn13(editingItem.isbn13 || "");
      setIsbn10(editingItem.isbn10 || "");
      setPublisher(editingItem.publisher || "");
      setPublishedYear(editingItem.publishedYear || "");
      setLanguage(editingItem.language || "en");
      setFormat(editingItem.format || "BOOK");
      setCallNumber(editingItem.callNumber || "");
      setShelfLocation(editingItem.shelfLocation || "");
      setCategoryId(editingItem.categoryId || "");
      setSubjects(editingItem.subjects ? editingItem.subjects.join(", ") : "");
      setCoverUrl(editingItem.coverUrl || "");
    } else {
      resetForm();
    }
    setError(null);
  }, [editingItem, isOpen]);

  function resetForm() {
    setIsbnLookupInput("");
    setLookupMessage(null);
    setLookupError(null);
    setTitle("");
    setSubtitle("");
    setAuthors("");
    setIsbn13("");
    setIsbn10("");
    setPublisher("");
    setPublishedYear("");
    setLanguage("en");
    setFormat("BOOK");
    setCallNumber("");
    setShelfLocation("");
    setCategoryId("");
    setSubjects("");
    setDescription("");
    setCoverUrl("");
    setError(null);
  }

  async function handleIsbnLookup() {
    const cleanIsbn = isbnLookupInput.replace(/[-\s]/g, "").trim();
    if (!cleanIsbn) return;

    setLookingUpIsbn(true);
    setLookupError(null);
    setLookupMessage(null);

    try {
      const data = await catalogueService.lookupIsbn(cleanIsbn);
      if (data.title) setTitle(data.title);
      if (data.subtitle) setSubtitle(data.subtitle);
      if (Array.isArray(data.authors) && data.authors.length > 0) {
        setAuthors(data.authors.join(", "));
      }
      if (data.publisher) setPublisher(data.publisher);
      if (data.publishedYear) setPublishedYear(Number(data.publishedYear));
      if (data.description) setDescription(data.description);
      if (data.coverUrl) setCoverUrl(data.coverUrl);
      if (data.isbn13) setIsbn13(data.isbn13);
      if (data.isbn10) setIsbn10(data.isbn10);
      setLookupMessage(`Auto-filled metadata for "${data.title}" via ISBN.`);
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : "Could not find ISBN metadata",
      );
    } finally {
      setLookingUpIsbn(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const authorsArray = authors
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const subjectsArray = subjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: CreateCatalogueItemInput = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        authors: authorsArray,
        publisher: publisher.trim() || undefined,
        publishedYear: publishedYear ? Number(publishedYear) : undefined,
        language: language.trim() || "en",
        format,
        callNumber: callNumber.trim() || undefined,
        shelfLocation: shelfLocation.trim() || undefined,
        categoryId: categoryId || undefined,
        subjects: subjectsArray,
        description: description.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
        isbn13: isbn13.trim() || undefined,
        isbn10: isbn10.trim() || undefined,
      };

      if (editingItem) {
        await catalogueService.update(editingItem.id, payload);
      } else {
        await catalogueService.create(payload);
      }
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save catalogue title",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingItem ? "Edit Catalogue Title" : "Add New Title to Catalogue"
      }
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {lookupMessage && <Alert variant="success">{lookupMessage}</Alert>}
        {lookupError && <Alert variant="warning">{lookupError}</Alert>}

        {/* ISBN Auto-fill Section (Create mode only) */}
        {!editingItem && (
          <div className="bg-surface-raised rounded-xl p-3 border border-border space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              Auto-populate from ISBN (Google Books / OpenLibrary)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 9780132350884"
                value={isbnLookupInput}
                onChange={(e) => setIsbnLookupInput(e.target.value)}
                className="text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                isLoading={lookingUpIsbn}
                onClick={handleIsbnLookup}
              >
                Lookup
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">
                Title *
              </label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">
                Subtitle
              </label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Subtitle"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Authors (comma-separated) *
              </label>
              <Input
                required
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                placeholder="e.g. Robert C. Martin"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Format *
              </label>
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                options={ITEM_FORMATS.map((f) => ({ value: f, label: f }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Category
              </label>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={[
                  { value: "", label: "None" },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Publisher
              </label>
              <Input
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Publisher"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Published Year
              </label>
              <Input
                type="number"
                value={publishedYear}
                onChange={(e) =>
                  setPublishedYear(e.target.value ? Number(e.target.value) : "")
                }
                placeholder="e.g. 2008"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Call Number
              </label>
              <Input
                value={callNumber}
                onChange={(e) => setCallNumber(e.target.value)}
                placeholder="e.g. 005.1 MAR"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Shelf Location
              </label>
              <Input
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                placeholder="e.g. Shelf A-3"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                ISBN-13
              </label>
              <Input
                value={isbn13}
                onChange={(e) => setIsbn13(e.target.value)}
                placeholder="9780132350884"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingItem ? "Save Changes" : "Save Title"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
