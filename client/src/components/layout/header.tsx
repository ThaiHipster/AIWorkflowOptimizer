import { UserProfile } from "@/components/layout/user-profile";
import { useMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { logout } = useAuth();
  const isMobile = useMobile();

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <svg
            className="h-8 w-8 text-primary-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h1 className="text-xl font-semibold text-gray-900">AI Workflow Optimizer</h1>
          <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">v1.0</span>
        </div>

        {/* User Profile */}
        <div className="flex items-center">
          <UserProfile />
          
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-2"
              onClick={logout}
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
