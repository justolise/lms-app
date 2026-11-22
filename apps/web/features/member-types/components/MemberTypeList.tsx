"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/classnames";
import type { MemberTypeSummary } from "../types/member-types.types";

interface MemberTypeListProps {
  memberTypes: MemberTypeSummary[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (type: MemberTypeSummary) => void;
  onEdit: (type: MemberTypeSummary) => void;
}

export function MemberTypeList({
  memberTypes,
  selectedId,
  loading,
  onSelect,
  onEdit,
}: MemberTypeListProps) {
  if (loading) {
    return (
      <div className="p-8 text-center flex justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (memberTypes.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
        No member types defined yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {memberTypes.map((type) => {
        const isSelected = type.id === selectedId;
        return (
          <div
            key={type.id}
            className={cn(
              "p-3 rounded-xl border transition-all flex items-center justify-between gap-3",
              isSelected
                ? "bg-surface border-primary shadow-sm"
                : "bg-surface/50 border-border hover:bg-surface",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(type)}
              className="flex-1 text-left space-y-1 cursor-pointer focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">
                  {type.name}
                </span>
                <Badge variant={type.isActive ? "success" : "muted"}>
                  {type.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {type.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {type.description}
                </p>
              )}
            </button>

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(type);
              }}
            >
              Edit
            </Button>
          </div>
        );
      })}
    </div>
  );
}
