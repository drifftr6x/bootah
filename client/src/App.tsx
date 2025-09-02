import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/sidebar";
import Dashboard from "@/pages/dashboard";
import Devices from "@/pages/devices";
import Images from "@/pages/images";
import Deployments from "@/pages/deployments";
import Templates from "@/pages/templates";
import Network from "@/pages/network";
import Workstations from "@/pages/workstations";
import Monitoring from "@/pages/monitoring";
import Security from "@/pages/security";
import Users from "@/pages/users";
import Configuration from "@/pages/configuration";
import Logs from "@/pages/logs";
import Help from "@/pages/help";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/devices" component={Devices} />
          <Route path="/images" component={Images} />
          <Route path="/deployments" component={Deployments} />
          <Route path="/templates" component={Templates} />
          <Route path="/network" component={Network} />
          <Route path="/workstations" component={Workstations} />
          <Route path="/monitoring" component={Monitoring} />
          <Route path="/security" component={Security} />
          <Route path="/users" component={Users} />
          <Route path="/configuration" component={Configuration} />
          <Route path="/logs" component={Logs} />
          <Route path="/help" component={Help} />
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
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
