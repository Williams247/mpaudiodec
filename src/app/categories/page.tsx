"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import CategoryManager from "@/views/CategoryManager";

export const dynamic = "force-dynamic";

export default function CategoriesPage() {
  return (
    <ProtectedRoute>
      <CategoryManager />
    </ProtectedRoute>
  );
}
