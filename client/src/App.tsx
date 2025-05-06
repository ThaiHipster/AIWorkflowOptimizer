import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/contexts/auth-context";
import { ChatProvider } from "@/contexts/chat-context";
import LoginPage from "@/pages/login";
import ChatPage from "@/pages/chat";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/login" component={LoginPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChatProvider>
          <Router />
          <Toaster />
        </ChatProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
