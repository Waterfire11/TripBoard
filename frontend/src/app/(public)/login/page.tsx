"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, ArrowLeft, Shield, Users, Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const router = useRouter();

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleNavigateToRegister = () => {
    router.push('/register');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Floating Geometric Shapes */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-r from-teal-400 to-blue-400 rounded-full opacity-15 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>

        {/* Additional floating elements */}
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full opacity-15 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.4) 1px, transparent 0)',
            backgroundSize: '30px 30px'
          }}
        ></div>
      </div>

      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-50">
        <Button
          variant="ghost"
          onClick={handleBackToHome}
          className="text-slate-600 hover:text-slate-800 hover:bg-white/80 backdrop-blur-sm transition-all duration-200 border border-white/40 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>

      {/* Main Content */}
      <div className="relative z-30 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-xl transform rotate-3 hover:rotate-1 transition-transform duration-300 hover:shadow-2xl">
              <Plane className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back!</h1>
            <p className="text-slate-600 text-lg">Ready to plan your next adventure?</p>
          </div>

          {/* Login Card */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border border-white/60 overflow-hidden relative hover:shadow-3xl transition-shadow duration-300">
            {/* Card background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 z-0"></div>

            <CardHeader className="relative z-20 pb-6">
              <CardTitle className="text-center text-2xl font-semibold text-slate-800">
                Sign In
              </CardTitle>
              <p className="text-center text-slate-600 mt-2">
                Continue to your TripBoard dashboard
              </p>
            </CardHeader>

            <CardContent className="relative z-20 space-y-8">
              <LoginForm />

              {/* Sign Up Link - Moved up and styled to fill space */}
              <div className="text-center pt-4 border-t border-slate-100 relative z-20">
                <p className="text-sm text-slate-600">
                  New to TripBoard?{" "}
                  <button
                    onClick={handleNavigateToRegister}
                    className="text-blue-600 hover:text-blue-500 font-semibold transition-colors hover:underline bg-transparent border-none cursor-pointer"
                  >
                    Create your free account
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Trust Indicators - Enhanced spacing to balance the page */}
          <div className="mt-12 flex items-center justify-center space-x-6 text-sm text-slate-500 relative z-20">
            <div className="flex items-center bg-white/50 rounded-full px-3 py-2 backdrop-blur-sm">
              <Shield className="w-4 h-4 text-green-500 mr-2" />
              <span className="font-medium">Secure Login</span>
            </div>
            <div className="flex items-center bg-white/50 rounded-full px-3 py-2 backdrop-blur-sm">
              <Users className="w-4 h-4 text-blue-500 mr-2" />
              <span className="font-medium">10k+ Users</span>
            </div>
            <div className="flex items-center bg-white/50 rounded-full px-3 py-2 backdrop-blur-sm">
              <Gift className="w-4 h-4 text-purple-500 mr-2" />
              <span className="font-medium">Free Plan</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-xs text-slate-500 space-y-2 relative z-20">
            <p>
              By signing in, you agree to our{" "}
              <a href="#" className="text-blue-600 hover:text-blue-500 transition-colors hover:underline cursor-pointer">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:text-blue-500 transition-colors hover:underline cursor-pointer">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}