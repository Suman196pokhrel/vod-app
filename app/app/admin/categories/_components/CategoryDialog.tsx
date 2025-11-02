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

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (categoryData: Partial<Category>) => void;
}

const emojiOptions = [
  "🎬", "🎭", "🎪", "🎨", "🎮", "🎯", "🎲", "🎵",
  "🎸", "🎺", "🎻", "🎤", "🎧", "📺", "📽️", "📹",
  "🏃", "⚽", "🏀", "🎾", "🏈", "⚾", "🎳", "🎿",
  "🎃", "🎄", "🎆", "🎇", "✨", "🎉", "🎊", "🎁",
  "❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍",
  "🌍", "🌊", "🌙", "⭐", "🌈", "🔥", "💎", "🏆",
];

const colorOptions = [
  { name: "Blue", value: "bg-blue-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Red", value: "bg-red-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Pink", value: "bg-pink-500" },
  { name: "Indigo", value: "bg-indigo-500" },
  { name: "Teal", value: "bg-teal-500" },
];

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSave,
}: CategoryDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    emoji: "🎬",
    color: "bg-blue-500",
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description,
        emoji: category.emoji,
        color: category.color,
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        emoji: "🎬",
        color: "bg-blue-500",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 max-w-2xl">
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
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>

          {/* Auto-generated Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug (auto-generated)</Label>
            <Input
              id="slug"
              value={formData.slug}
              readOnly
              className="bg-gray-50 border-gray-300 text-gray-600"
            />
            <p className="text-xs text-gray-500">
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
              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Emoji Selection */}
          <div className="space-y-2">
            <Label>Category Icon (Emoji)</Label>
            <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-md bg-gray-50 max-h-32 overflow-y-auto">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, emoji })}
                  className={`text-2xl p-2 rounded-md transition-colors ${
                    formData.emoji === emoji
                      ? "bg-blue-500 ring-2 ring-blue-600"
                      : "hover:bg-gray-200"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Category Color</Label>
            <div className="flex flex-wrap gap-3">
              {colorOptions.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, color: colorOption.value })
                  }
                  className={`w-12 h-12 ${colorOption.value} rounded-lg transition-transform ${
                    formData.color === colorOption.value
                      ? "ring-4 ring-gray-400 scale-110"
                      : "hover:scale-105"
                  }`}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg bg-gray-50">
              <div
                className={`w-12 h-12 ${formData.color} rounded-lg flex items-center justify-center text-2xl`}
              >
                {formData.emoji}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{formData.name || "Category Name"}</p>
                <p className="text-sm text-gray-500">{formData.slug || "url-slug"}</p>
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