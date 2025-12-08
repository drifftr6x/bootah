import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Server, Mail, ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordForm) {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      const response = await res.json();
      
      setIsSubmitted(true);
      
      if (response.token) {
        setDevToken(response.token);
      }
      
      toast({
        title: "Email Sent",
        description: "If an account exists, a password reset link has been sent.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-green-500/10 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Server className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
              Bootah64x
            </h1>
          </div>

          <Card className="backdrop-blur-sm bg-card/50 border-primary/20 shadow-2xl shadow-cyan-500/10">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-green-500/20 p-3">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-xl">Check Your Email</CardTitle>
              <CardDescription>
                If an account exists with that email, we've sent password reset instructions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {devToken && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-yellow-600 font-medium mb-2">Development Mode Only:</p>
                  <p className="text-xs text-muted-foreground mb-2">Reset Link:</p>
                  <Link 
                    href={`/reset-password?token=${devToken}`} 
                    className="text-xs text-primary hover:underline break-all"
                  >
                    Click here to reset password
                  </Link>
                </div>
              )}
              
              <div className="text-center">
                <Link href="/login" className="text-primary hover:underline inline-flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-green-500/10 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Server className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
            Bootah64x
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Password Recovery
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-card/50 border-primary/20 shadow-2xl shadow-cyan-500/10">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Forgot Password?</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          autoComplete="email"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800"
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Send Reset Link
                    </span>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-primary hover:underline inline-flex items-center gap-2 text-sm">
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
