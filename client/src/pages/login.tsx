import { useEffect } from "react";
import { useLocation } from "wouter";
import { LoginForm } from "@/components/auth/login-form";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to main page if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4">
        <LoginForm />
      </div>
    </div>
  );
}
