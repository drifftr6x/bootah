import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Setup from "@/pages/setup";
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
import DomainJoinPage from "@/pages/DomainJoinPage";
import ProductKeysPage from "@/pages/ProductKeysPage";
import CustomScriptsPage from "@/pages/CustomScriptsPage";
import PostDeploymentProfilesPage from "@/pages/PostDeploymentProfilesPage";
import ApiDocumentation from "@/pages/api-documentation";
import Analytics from "@/pages/analytics";
import WebhooksPage from "@/pages/webhooks";

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, authMode } = useAuth();
  const { isConnected } = useWebSocket();
  const [location] = useLocation();

  const publicAuthPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/setup'];
  const isPublicAuthPath = publicAuthPaths.some(path => location.startsWith(path));

  const { data: setupStatus } = useQuery<{ setupRequired: boolean }>({
    queryKey: ["/api/auth/setup-required"],
    enabled: authMode === "local",
    retry: false,
  });

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

  if (authMode === "local" && setupStatus?.setupRequired && location !== "/setup") {
    return <Setup />;
  }

  if (isPublicAuthPath && authMode === "local") {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/setup" component={Setup} />
      </Switch>
    );
  }

  if (!isAuthenticated) {
    return authMode === "local" ? <Login /> : <Landing />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
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
          <Route path="/domain-join" component={DomainJoinPage} />
          <Route path="/product-keys" component={ProductKeysPage} />
          <Route path="/custom-scripts" component={CustomScriptsPage} />
          <Route path="/post-deployment-profiles" component={PostDeploymentProfilesPage} />
          <Route path="/api-documentation" component={ApiDocumentation} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/webhooks" component={WebhooksPage} />
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
