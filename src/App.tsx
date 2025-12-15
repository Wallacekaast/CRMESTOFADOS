import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
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
import { apiFetch } from "@/lib/api";
import Catalog from "./pages/Catalog";
import MemberArea from "./pages/MemberArea";
import Members from "./pages/Members";
import MemberOrders from "./pages/MemberOrders";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const clientRoutes = new Set(['/minha-conta', '/meus-pedidos', '/catalogo']);

  useEffect(() => {
    (async () => {
      try {
        if (user?.email) {
          const res = await apiFetch(`/api/members/exists?email=${encodeURIComponent(user.email)}`);
          setIsMember(Boolean(res?.exists));
        } else {
          setIsMember(null);
        }
      } catch {
        setIsMember(null);
      } finally {
        setChecked(true);
      }
    })();
  }, [user?.email]);

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

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const path = location.pathname;
  const isAdmin = user?.role === 'admin';
  if (isMember && !isAdmin) {
    if (!clientRoutes.has(path)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="content-card w-full max-w-md">
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Acesso restrito</h2>
              <p className="text-muted-foreground text-sm">Esta página é exclusiva para administradores.</p>
              <Link to="/meus-pedidos">
                <Button className="w-full">Ir para Meus Pedidos</Button>
              </Link>
              <Link to="/catalogo">
                <Button variant="outline" className="w-full">Ir para Catálogo</Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/*" element={<Auth />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/entrar" element={<Auth />} />
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
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Index />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/painel"
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
      <Route
        path="/minha-conta"
        element={
          <ProtectedRoute>
            <MainLayout>
              <MemberArea />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/meus-pedidos"
        element={
          <ProtectedRoute>
            <MainLayout>
              <MemberOrders />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/membros-admin"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Members />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogo"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Catalog />
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
