"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderPlus, Search } from "lucide-react";
import { CategoryCard, Category } from "./_components/CategoryCard";
import { CategoryDialog } from "./_components/CategoryDialog";
import { CategoryStats } from "./_components/CategoryStats";
import { EmptyState } from "./_components/EmptyState";

// Mock categories data
const mockCategories: Category[] = [
  {
    id: 1,
    name: "Action",
    slug: "action",
    description: "High-octane thrills, intense sequences, and adrenaline-pumping adventures",
    emoji: "💥",
    color: "bg-red-500",
    videoCount: 45,
    totalViews: 125400,
    isActive: true,
    createdAt: "2024-01-15",
  },
  {
    id: 2,
    name: "Comedy",
    slug: "comedy",
    description: "Laugh-out-loud moments and feel-good entertainment",
    emoji: "😄",
    color: "bg-yellow-500",
    videoCount: 38,
    totalViews: 98200,
    isActive: true,
    createdAt: "2024-01-16",
  },
  {
    id: 3,
    name: "Drama",
    slug: "drama",
    description: "Compelling stories with emotional depth and character development",
    emoji: "🎭",
    color: "bg-purple-500",
    videoCount: 52,
    totalViews: 145800,
    isActive: true,
    createdAt: "2024-01-17",
  },
  {
    id: 4,
    name: "Documentary",
    slug: "documentary",
    description: "Real-life stories, educational content, and factual programming",
    emoji: "📽️",
    color: "bg-blue-500",
    videoCount: 29,
    totalViews: 67300,
    isActive: true,
    createdAt: "2024-01-18",
  },
  {
    id: 5,
    name: "Thriller",
    slug: "thriller",
    description: "Suspenseful narratives that keep you on the edge of your seat",
    emoji: "😱",
    color: "bg-gray-700",
    videoCount: 34,
    totalViews: 89500,
    isActive: true,
    createdAt: "2024-01-19",
  },
  {
    id: 6,
    name: "Sci-Fi",
    slug: "sci-fi",
    description: "Futuristic worlds, space exploration, and technological wonders",
    emoji: "🚀",
    color: "bg-indigo-500",
    videoCount: 27,
    totalViews: 78900,
    isActive: true,
    createdAt: "2024-01-20",
  },
  {
    id: 7,
    name: "Horror",
    slug: "horror",
    description: "Spine-chilling scares and supernatural mysteries",
    emoji: "👻",
    color: "bg-orange-500",
    videoCount: 22,
    totalViews: 54200,
    isActive: false,
    createdAt: "2024-01-21",
  },
  {
    id: 8,
    name: "Romance",
    slug: "romance",
    description: "Heartwarming love stories and romantic adventures",
    emoji: "💕",
    color: "bg-pink-500",
    videoCount: 31,
    totalViews: 71800,
    isActive: true,
    createdAt: "2024-01-22",
  },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Filter categories
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const stats = {
    totalCategories: categories.length,
    activeCategories: categories.filter((c) => c.isActive).length,
    totalVideos: categories.reduce((sum, c) => sum + c.videoCount, 0),
    totalViews: categories.reduce((sum, c) => sum + c.totalViews, 0),
  };

  // Handlers
  const handleAddCategory = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleSaveCategory = (categoryData: Partial<Category>) => {
    if (editingCategory) {
      // Update existing category
      setCategories(
        categories.map((cat) =>
          cat.id === editingCategory.id
            ? { ...cat, ...categoryData }
            : cat
        )
      );
      console.log("Updated category:", categoryData);
    } else {
      // Add new category
      const newCategory: Category = {
        id: categories.length + 1,
        name: categoryData.name!,
        slug: categoryData.slug!,
        description: categoryData.description!,
        emoji: categoryData.emoji!,
        color: categoryData.color!,
        videoCount: 0,
        totalViews: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setCategories([...categories, newCategory]);
      console.log("Added new category:", newCategory);
    }
  };

  const handleDeleteCategory = (categoryId: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      setCategories(categories.filter((cat) => cat.id !== categoryId));
      console.log("Deleted category:", categoryId);
    }
  };

  const handleToggleStatus = (categoryId: number) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId ? { ...cat, isActive: !cat.isActive } : cat
      )
    );
    console.log("Toggled status for category:", categoryId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-600 mt-1">
              Organize your content with categories and genres
            </p>
          </div>
          <Button onClick={handleAddCategory} className="gap-2">
            <FolderPlus className="w-4 h-4" />
            Add Category
          </Button>
        </div>

        {/* Stats */}
        <CategoryStats
          totalCategories={stats.totalCategories}
          activeCategories={stats.activeCategories}
          totalVideos={stats.totalVideos}
          totalViews={stats.totalViews}
        />

        {/* Search */}
        {categories.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>
        )}

        {/* Categories Grid or Empty State */}
        {categories.length === 0 ? (
          <EmptyState onAddCategory={handleAddCategory} />
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-500">
              No categories found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        {categories.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>
              Showing <span className="font-medium">{filteredCategories.length}</span> of{" "}
              <span className="font-medium">{categories.length}</span> categories
            </p>
            <p className="text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Category Dialog */}
        <CategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          category={editingCategory}
          onSave={handleSaveCategory}
        />
      </div>
    </div>
  );
}