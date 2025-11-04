import { useQuery } from "@tanstack/react-query";

export function useAuth() {
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

  // Treat 401 (unauthorized) as unauthenticated, not an error
  const isAuthenticated = !!user && !error;

  return {
    user: isAuthenticated ? user : null,
    isLoading,
    isAuthenticated,
  };
}
