"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { api } from "@/lib/api"

interface User {
  id: string
  name: string
  role: string
  avatar: string | null
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (userName: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is logged in on mount via cookie
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profile = await api.getProfile()
        if (profile.success && profile.user) {
          const user: User = {
            id: profile.user.id,
            name: profile.user.userName,
            role: "管理者",
            avatar: null,
          }
          setUser(user)
        }
      } catch (error) {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = async (userName: string, password: string): Promise<boolean> => {
    try {
      const response = await api.login(userName, password)
      
      if (response.success && response.user) {
        // Fetch profile from cookie to get full user info
        const profile = await api.getProfile()
        if (profile.success && profile.user) {
          const user: User = {
            id: profile.user.id,
            name: profile.user.userName,
            role: "管理者",
            avatar: null,
          }
          setUser(user)
          return true
        }
      }
      return false
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}


