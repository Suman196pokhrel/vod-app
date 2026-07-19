import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { CATEGORY_ICONS, type CategoryIconKey } from "@/lib/icons/categoryIcons";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: CategoryIconKey;
  videoCount: number;
  totalViews: number;
  isActive: boolean;
  createdAt: string;
}

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: number) => void;
  onToggleStatus: (categoryId: number) => void;
}

export function CategoryCard({
  category,
  onEdit,
  onDelete,
  onToggleStatus,
}: CategoryCardProps) {
  const Icon = CATEGORY_ICONS[category.icon];

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow duration-(--duration-fast)">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {category.name}
            </h3>
            <p className="text-sm text-muted-foreground">{category.slug}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onEdit(category)}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Category
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onToggleStatus(category.id)}
              className="gap-2"
            >
              {category.isActive ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Disable
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Enable
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(category.id)}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {category.description}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Videos</p>
            <p className="text-lg font-semibold text-foreground">
              {category.videoCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Views</p>
            <p className="text-lg font-semibold text-foreground">
              {category.totalViews.toLocaleString()}
            </p>
          </div>
        </div>
        <div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
              category.isActive
                ? "bg-accent text-primary border-primary/20"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {category.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </div>
  );
}
