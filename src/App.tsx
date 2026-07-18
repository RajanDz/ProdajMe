import "./i18n/index";
import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/common/ProtectedRoute";

import { HomePage } from "./pages/HomePage";
import { ListingsPage } from "./pages/ListingsPage";
import { ListingPage } from "./pages/ListingPage";
import { CreateListingPage } from "./pages/CreateListingPage";
import { EditListingPage } from "./pages/EditListingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { MyProfilePage } from "./pages/MyProfilePage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/listings" element={<ListingsPage />} />
      <Route path="/listings/new" element={
        <ProtectedRoute>
          <CreateListingPage />
        </ProtectedRoute>
      } />
      <Route path="/listings/:id" element={<ListingPage />} />
      <Route path="/listings/:id/edit" element={
        <ProtectedRoute>
          <EditListingPage />
        </ProtectedRoute>
      } />
      <Route path="/users/:username" element={<ProfilePage />} />
      <Route path="/profile" element={
        <ProtectedRoute>
          <MyProfilePage />
        </ProtectedRoute>
      } />
      <Route path="/profile/edit" element={
        <ProtectedRoute>
          <EditProfilePage />
        </ProtectedRoute>
      } />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }>
          <AppRoutes />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
