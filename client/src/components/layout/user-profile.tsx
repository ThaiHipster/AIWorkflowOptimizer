import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface UserProfileProps {
  className?: string;
}

export function UserProfile({ className }: UserProfileProps) {
  const { user, logout } = useAuth();
  
  if (!user) {
    return null;
  }

  // Get user initials from company name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(user.company_name);

  return (
    <div className={cn("flex items-center", className)}>
      <div className="hidden md:flex items-center space-x-2">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user.company_name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          aria-label="Logout"
          onClick={logout}
          className="text-gray-400 hover:text-gray-500"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
