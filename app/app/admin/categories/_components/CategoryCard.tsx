import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Eye, EyeOff } from "lucide-react";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  color: string;
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
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center text-2xl`}
          >
            {category.emoji}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {category.name}
            </h3>
            <p className="text-sm text-gray-500">{category.slug}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border-gray-200">
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
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem
              onClick={() => onDelete(category.id)}
              className="gap-2 text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {category.description}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex gap-4">
          <div>
            <p className="text-xs text-gray-500">Videos</p>
            <p className="text-lg font-semibold text-gray-900">
              {category.videoCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Views</p>
            <p className="text-lg font-semibold text-gray-900">
              {category.totalViews.toLocaleString()}
            </p>
          </div>
        </div>
        <div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              category.isActive
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-gray-100 text-gray-700 border border-gray-300"
            }`}
          >
            {category.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </div>
  );
}