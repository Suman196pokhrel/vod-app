import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Category } from "./CategoryCard";
import { CATEGORY_ICONS, CATEGORY_ICON_KEYS, CATEGORY_ICON_LABELS, type CategoryIconKey } from "@/lib/icons/categoryIcons";
import { MorphIcon } from "@/lib/motion/MorphIcon";
import { Check } from "lucide-react";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (categoryData: Partial<Category>) => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSave,
}: CategoryDialogProps) {
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    icon: CategoryIconKey;
  }>({
    name: "",
    slug: "",
    description: "",
    icon: "all",
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        icon: "all",
      });
    }
  }, [category, open]);

  const handleNameChange = (value: string) => {
    setFormData({
      ...formData,
      name: value,
      slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    });
  };

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const PreviewIcon = CATEGORY_ICONS[formData.icon];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit Category" : "Add New Category"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Update the category details below"
              : "Create a new category for organizing your videos"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Action, Comedy, Documentary"
            />
          </div>

          {/* Auto-generated Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug (auto-generated)</Label>
            <Input
              id="slug"
              value={formData.slug}
              readOnly
              className="bg-muted text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs: /category/{formData.slug || "action"}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of this category..."
              className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md bg-transparent text-foreground text-sm shadow-xs focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Category Icon</Label>
            <div className="flex flex-wrap gap-2 p-3 border border-border rounded-md bg-muted/50">
              {CATEGORY_ICON_KEYS.map((key) => {
                const selected = formData.icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: key })}
                    aria-label={CATEGORY_ICON_LABELS[key]}
                    title={CATEGORY_ICON_LABELS[key]}
                    aria-pressed={selected}
                    className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-(--duration-fast) ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <MorphIcon from={CATEGORY_ICONS[key]} to={Check} active={selected} size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-muted/50">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <PreviewIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{formData.name || "Category Name"}</p>
                <p className="text-sm text-muted-foreground">{formData.slug || "url-slug"}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name}>
            {category ? "Update Category" : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
