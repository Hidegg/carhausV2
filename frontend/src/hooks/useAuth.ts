import { createContext, useContext } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/client'
import { User } from '../types'

interface AuthContext {
  user: User | undefined
  isLoading: boolean
  isAuthenticated: boolean
  login: (creds: { username: string; password: string }) => Promise<User>
  logout: () => Promise<void>
  loginError: Error | null
  isLoggingIn: boolean
}

export const AuthContext = createContext<AuthContext | null>(null)

export function useAuthProvider(): AuthContext {
  const queryClient = useQueryClient()

  const { data: user, isPending, isError } = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    throwOnError: false,
  })

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password),
    onSuccess: (data) => queryClient.setQueryData(['auth', 'me'], data),
  })

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => queryClient.setQueryData(['auth', 'me'], null),
  })

  return {
    user: isError ? undefined : user,
    isLoading: isPending && !isError,
    isAuthenticated: !!user && !isError,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
  }
}

export function useAuth(): AuthContext {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
