import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth/auth-form";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
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
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* Form Section */}
      <div className="w-full lg:w-1/2 p-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              AI Workflow Optimizer
            </h1>
            <p className="text-gray-600">
              Login or register to access your workflow optimization tools
            </p>
          </div>
          <AuthForm />
        </div>
      </div>

      {/* Hero Section */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-r from-primary-100 to-indigo-100">
        <div className="h-full p-12 flex flex-col justify-center">
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold mb-6 text-gray-900">
              Transform Your Business Processes with AI
            </h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <div className="bg-primary-500 rounded-full p-1 mr-3 mt-1">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700">Interactive workflow mapping through natural conversation</p>
              </li>
              <li className="flex items-start">
                <div className="bg-primary-500 rounded-full p-1 mr-3 mt-1">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700">Automated workflow visualization with detailed diagrams</p>
              </li>
              <li className="flex items-start">
                <div className="bg-primary-500 rounded-full p-1 mr-3 mt-1">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700">AI-powered suggestions for process improvement and automation</p>
              </li>
            </ul>
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <p className="italic text-gray-600">
                "This tool helped us identify bottlenecks in our customer onboarding process and 
                reduced processing time by 45%."
              </p>
              <p className="mt-2 font-medium text-gray-900">— Sarah Chen, Operations Director</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}