import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";

interface EmptyStateProps {
  onAddCategory: () => void;
}

export function EmptyState({ onAddCategory }: EmptyStateProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FolderPlus className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Categories Yet
        </h3>
        <p className="text-gray-500 mb-6">
          Get started by creating your first category. Categories help organize
          your videos and make it easier for users to find content.
        </p>
        <Button onClick={onAddCategory} className="gap-2">
          <FolderPlus className="w-4 h-4" />
          Create Your First Category
        </Button>
      </div>
    </div>
  );
}