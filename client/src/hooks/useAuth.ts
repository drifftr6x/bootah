import { useQuery } from "@tanstack/react-query";

interface AuthConfig {
  authMode: "replit" | "local";
}

export function useAuth() {
  const { data: authConfig } = useQuery<AuthConfig>({
    queryKey: ["/api/auth/config"],
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    throwOnError: false,
    meta: {
      ignoreGlobalErrorHandler: true,
    },
    staleTime: Infinity,
  });

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    throwOnError: false,
    meta: {
      ignoreGlobalErrorHandler: true,
    },
  });

  const isAuthenticated = !!user && !error;
  const authMode = authConfig?.authMode || "replit";

  return {
    user: isAuthenticated ? user : null,
    isLoading,
    isAuthenticated,
    authMode,
  };
}
