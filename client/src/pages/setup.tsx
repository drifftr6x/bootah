import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Server, Shield, Eye, EyeOff, Check, X, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

const setupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().optional(),
  password: z.string().min(12, "Password must be at least 12 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetupForm = z.infer<typeof setupSchema>;

const passwordRequirements = [
  { regex: /.{12,}/, label: "At least 12 characters" },
  { regex: /[A-Z]/, label: "One uppercase letter" },
  { regex: /[a-z]/, label: "One lowercase letter" },
  { regex: /\d/, label: "One number" },
  { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, label: "One special character" },
];

export default function Setup() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { data: setupStatus, isLoading: checkingSetup } = useQuery<{ setupRequired: boolean }>({
    queryKey: ["/api/auth/setup-required"],
    retry: false,
  });

  const form = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      username: "",
      email: "",
      fullName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");

  useEffect(() => {
    if (setupStatus && !setupStatus.setupRequired) {
      setLocation("/login");
    }
  }, [setupStatus, setLocation]);

  async function onSubmit(data: SetupForm) {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/setup", {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        password: data.password,
      });
      const response = await res.json();
      
      if (response.success) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/setup-required"] });
        toast({
          title: "Setup Complete",
          description: "Admin account created. Please sign in.",
        });
        setLocation("/login");
      }
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to create admin account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-green-500/10 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Server className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
            Bootah64x
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Initial Setup
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-card/50 border-primary/20 shadow-2xl shadow-cyan-500/10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-primary/20 p-3">
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl">Create Administrator Account</CardTitle>
            <CardDescription>
              Set up the first admin account to start using Bootah. This account will have full access to all features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin"
                          autoComplete="username"
                          data-testid="input-username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          autoComplete="email"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Administrator"
                          autoComplete="name"
                          data-testid="input-fullname"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            autoComplete="new-password"
                            data-testid="input-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {password && (
                  <div className="space-y-1 text-xs bg-muted/50 p-3 rounded-lg">
                    <p className="font-medium mb-2">Password Requirements:</p>
                    {passwordRequirements.map((req, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 ${
                          req.regex.test(password) ? "text-green-500" : "text-muted-foreground"
                        }`}
                      >
                        {req.regex.test(password) ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your password"
                          autoComplete="new-password"
                          data-testid="input-confirm-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800"
                  disabled={isLoading}
                  data-testid="button-setup"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Setting up...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Rocket className="w-5 h-5" />
                      Complete Setup
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
