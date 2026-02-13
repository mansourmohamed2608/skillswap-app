import { Badge } from "@/components/ui/badge";
import { TagIcon } from "lucide-react";
import type { ServiceCategory } from "@/types";

interface CategoryPillProps {
  category: ServiceCategory;
  className?: string;
}

export function CategoryPill({ category, className }: CategoryPillProps) {
  return (
    <Badge variant="secondary" className={`inline-flex items-center gap-1 ${className}`}>
      <TagIcon className="h-3 w-3" />
      {category}
    </Badge>
  );
}
