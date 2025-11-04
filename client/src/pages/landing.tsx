import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Shield, Zap, Network, ChevronRight } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-green-500/10 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3lhbiIgc3Ryb2tlLW9wYWNpdHk9IjAuMDMiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50 pointer-events-none" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Server className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
            Bootah64x
          </h1>
          <p className="text-xl text-muted-foreground font-mono mb-2">
            Next-Generation PXE Boot Management Platform
          </p>
          <p className="text-sm text-muted-foreground/70">
            Enterprise-grade network imaging and deployment system
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-card/50 border-primary/20 shadow-2xl shadow-cyan-500/10 mb-8">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Access Required</CardTitle>
            <CardDescription>
              Secure authentication required to access the PXE management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              onClick={handleLogin}
              className="w-full h-12 text-base bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 shadow-lg shadow-cyan-500/25"
              data-testid="button-login"
            >
              Log In to Continue
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-xs text-muted-foreground">Secure Connection</p>
              </div>
              <div className="text-center">
                <Network className="w-8 h-8 mx-auto mb-2 text-cyan-500" />
                <p className="text-xs text-muted-foreground">RBAC Enabled</p>
              </div>
              <div className="text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-xs text-muted-foreground">Real-time Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="backdrop-blur-sm bg-card/30 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                PXE Server
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Network boot and OS imaging for multiple machines simultaneously
              </p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/30 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Role-based access control with comprehensive audit logging
              </p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/30 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Real-time deployment monitoring and automated imaging workflows
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
