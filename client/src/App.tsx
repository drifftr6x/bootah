import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
import Devices from "@/pages/devices";
import Images from "@/pages/images";
import Capture from "@/pages/capture";
import Deployments from "@/pages/deployments";
import ScheduledDeployments from "@/pages/scheduled-deployments";
import MulticastSessions from "@/pages/multicast-sessions";
import NetworkTopology from "@/pages/network-topology";
import Templates from "@/pages/templates";
import Network from "@/pages/network";
import Workstations from "@/pages/workstations";
import Monitoring from "@/pages/monitoring";
import Security from "@/pages/security";
import Users from "@/pages/users";
import UserManagement from "@/pages/user-management";
import Configuration from "@/pages/configuration";
import Logs from "@/pages/logs";
import Help from "@/pages/help";
import NotFound from "@/pages/not-found";
import SnapinsPage from "@/pages/SnapinsPage";
import HostnamePatternsPage from "@/pages/HostnamePatternsPage";

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isConnected } = useWebSocket();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <Landing />;
  }

  // Show main app if authenticated
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* WebSocket status indicator */}
        {!isConnected && (
          <div className="bg-orange-500 text-white text-center py-1 text-sm">
            Reconnecting to real-time updates...
          </div>
        )}
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/devices" component={Devices} />
          <Route path="/images" component={Images} />
          <Route path="/capture" component={Capture} />
          <Route path="/deployments" component={Deployments} />
          <Route path="/scheduled" component={ScheduledDeployments} />
          <Route path="/multicast" component={MulticastSessions} />
          <Route path="/topology" component={NetworkTopology} />
          <Route path="/templates" component={Templates} />
          <Route path="/network" component={Network} />
          <Route path="/workstations" component={Workstations} />
          <Route path="/monitoring" component={Monitoring} />
          <Route path="/security" component={Security} />
          <Route path="/users" component={Users} />
          <Route path="/user-management" component={UserManagement} />
          <Route path="/configuration" component={Configuration} />
          <Route path="/logs" component={Logs} />
          <Route path="/help" component={Help} />
          <Route path="/snapins" component={SnapinsPage} />
          <Route path="/hostname-patterns" component={HostnamePatternsPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthenticatedApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
