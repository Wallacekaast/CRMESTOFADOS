import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { MainLayout } from "./components/layout/MainLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Production from "./pages/Production";
import Inventory from "./pages/Inventory";
import TimeTracking from "./pages/TimeTracking";
 
import Boletos from "./pages/Boletos";
import PDV from "./pages/PDV";
import Products from "./pages/Products";
import SalesReport from "./pages/SalesReport";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Index />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/producao"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Production />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/estoque"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Inventory />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/ponto"
        element={
          <ProtectedRoute>
            <MainLayout>
              <TimeTracking />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/boletos"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Boletos />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pdv"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PDV />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/produtos"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Products />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendas"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SalesReport />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
