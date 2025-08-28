"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LayoutDashboard, CreditCard, Users, Star, Menu, X, Plane, ArrowRight } from "lucide-react";

// Custom hook for intersection observer
function useIsVisible(ref: React.RefObject<HTMLElement | null>) {
  const [isIntersecting, setIntersecting] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIntersecting(entry.isIntersecting);
    }, { threshold: 0.1 });
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref]);
  return isIntersecting;
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  // Refs for sections
  const featuresRef = useRef<HTMLElement | null>(null);
  const howItWorksRef = useRef<HTMLElement | null>(null);
  const reviewsRef = useRef<HTMLElement | null>(null);

  // Visibility states
  const featuresVisible = useIsVisible(featuresRef);
  const howItWorksVisible = useIsVisible(howItWorksRef);
  const reviewsVisible = useIsVisible(reviewsRef);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Navigation handlers
  const handleLoginNavigation = () => {
    router.push('/login');
  };
  const handleRegisterNavigation = () => {
    router.push('/register');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-lg border-b border-slate-200/20 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                TripBoard
              </span>
            </div>
            {/* Desktop Navigation */}
            <nav className="hidden md:block">
              <ul className="flex items-center space-x-8">
                {['Features', 'Reviews'].map((item) => {
                  const id = `#${item.toLowerCase().replace(' ', '-')}`;
                  return (
                    <li key={item}>
                      <a
                        href={id}
                        className="text-slate-600 hover:text-blue-600 transition-all duration-200 font-medium relative group"
                      >
                        {item}
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleLoginNavigation}
                className="text-slate-700 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200 cursor-pointer"
              >
                Sign In
              </Button>
              <Button
                onClick={handleRegisterNavigation}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-white">
                <SheetHeader>
                  <SheetTitle className="text-left">Navigation</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col space-y-4 mt-8">
                  {['Features', 'Reviews'].map((item) => {
                    const id = `#${item.toLowerCase().replace(' ', '-')}`;
                    return (
                      <a
                        key={item}
                        href={id}
                        className="text-slate-600 hover:text-blue-600 transition-colors duration-200 px-2 py-2 font-medium"
                      >
                        {item}
                      </a>
                    );
                  })}
                  <div className="flex flex-col space-y-3 pt-6 border-t border-slate-200">
                    <Button variant="ghost" onClick={() => { setMobileMenuOpen(false); handleLoginNavigation(); }} className="cursor-pointer">
                      Sign In
                    </Button>
                    <Button onClick={() => { setMobileMenuOpen(false); handleRegisterNavigation(); }} className="cursor-pointer">
                      Get Started
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30"></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className={`text-center lg:text-left transform transition-all duration-1000 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8 border border-blue-200">
                  <Star className="h-4 w-4 mr-2 fill-current" />
                  Trusted by 10,000+ travelers
                </div>

                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                    Plan Your Perfect
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Adventure
                  </span>
                </h1>

                <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl">
                  Organize destinations, track budgets, and collaborate with travel companions using our beautiful kanban-style planning boards.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                  <Button
                    size="lg"
                    onClick={handleRegisterNavigation}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 cursor-pointer"
                  >
                    Start Planning Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
                {/* Metrics with staggered animation */}
                <div className="flex flex-col sm:flex-row gap-8 justify-center lg:justify-start">
                  {[
                    { number: '10k+', label: 'Happy Travelers', delay: '' },
                    { number: '50k+', label: 'Trips Planned', delay: 'delay-200' },
                    { number: '4.9', label: 'User Rating', icon: Star, delay: 'delay-300' }
                  ].map((metric, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${metric.delay}`}
                    >
                      <span className="text-2xl font-bold text-slate-800">{metric.number}</span>
                      {metric.icon && <metric.icon className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
                      <span className="text-slate-600">{metric.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Kanban Board Visual */}
              <div className={`flex justify-center lg:justify-end transform transition-all duration-1000 delay-300 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <div className="relative group">
                  {/* Floating elements */}
                  <div className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-20 animate-pulse"></div>
                  <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse delay-1000"></div>

                  {/* Main board */}
                  <div className="bg-white rounded-2xl p-8 shadow-2xl border border-slate-200/50 transform group-hover:scale-105 transition-all duration-500">
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                      <div className="text-sm font-medium text-slate-800">Europe Trip 2025</div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 min-h-[340px] w-[420px]">
                      {/* Planning Column */}
                      <div className="bg-gradient-to-b from-slate-50 to-slate-100/50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          Planning
                        </h3>
                        <div className="space-y-3">
                          <div className="bg-white border-l-4 border-blue-400 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="font-medium text-slate-800 text-sm">Research Hotels</div>
                            <div className="text-slate-600 text-xs mt-1">$500 budget</div>
                          </div>
                          <div className="bg-white border-l-4 border-amber-400 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="font-medium text-slate-800 text-sm">Book Flights</div>
                            <div className="text-slate-600 text-xs mt-1">$800 budget</div>
                          </div>
                        </div>
                      </div>
                      {/* In Progress Column */}
                      <div className="bg-gradient-to-b from-slate-50 to-slate-100/50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          In Progress
                        </h3>
                        <div className="space-y-3">
                          <div className="bg-white border-l-4 border-purple-400 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="font-medium text-slate-800 text-sm">Airport Transfer</div>
                            <div className="text-slate-600 text-xs mt-1">$50 booked</div>
                          </div>
                        </div>
                      </div>
                      {/* Completed Column */}
                      <div className="bg-gradient-to-b from-slate-50 to-slate-100/50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          Completed
                        </h3>
                        <div className="space-y-3">
                          <div className="bg-white border-l-4 border-green-400 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="font-medium text-slate-800 text-sm">Get Passport</div>
                            <div className="text-green-600 flex items-center gap-1 text-xs mt-1">
                              <Star className="h-3 w-3 fill-current" />
                              Completed
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section
          ref={howItWorksRef}
          id="how-it-works"
          className="py-20 lg:py-32 bg-gradient-to-b from-slate-50 to-white"
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  How TripBoard Works
                </span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Plan your trips in 3 easy steps. No complexity, just results.
              </p>
            </div>
            <div className="grid lg:grid-cols-3 gap-12">
              {[
                {
                  number: '01',
                  title: 'Create Your Board',
                  description: 'Start with a template or create a custom board tailored to your trip. Add destinations, budgets, and travel companions.',
                  icon: LayoutDashboard,
                  gradient: 'from-blue-600 to-indigo-600'
                },
                {
                  number: '02',
                  title: 'Add Your Tasks',
                  description: 'Break down your trip into manageable tasks. Assign budgets, deadlines, and collaborators for each activity.',
                  icon: CreditCard,
                  gradient: 'from-green-600 to-emerald-600'
                },
                {
                  number: '03',
                  title: 'Track Progress',
                  description: 'Move tasks through your workflow as you complete them. Watch your trip come together in real-time.',
                  icon: Users,
                  gradient: 'from-purple-600 to-pink-600'
                }
              ].map((step, index) => (
                <div key={index} className="text-center group">
                  <div className={`w-20 h-20 mx-auto mb-8 bg-gradient-to-r ${step.gradient} rounded-2xl flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <step.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-4">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed max-w-sm mx-auto">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          ref={featuresRef}
          id="features"
          className={`py-20 lg:py-32 bg-white transition-all duration-700 ease-in-out ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
                Features that make a difference
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Everything You Need to Plan
                </span>
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: LayoutDashboard,
                  title: 'Visual Planning',
                  description: 'Organize your trip with intuitive Kanban boards. Drag and drop tasks from planning to completion.',
                  gradient: 'from-blue-500 to-indigo-500'
                },
                {
                  icon: CreditCard,
                  title: 'Smart Budgeting',
                  description: 'Track expenses in real-time with automatic calculations and per-person budget breakdowns.',
                  gradient: 'from-green-500 to-emerald-500'
                },
                {
                  icon: Users,
                  title: 'Team Collaboration',
                  description: 'Plan together with real-time collaboration, comments, and role-based permissions.',
                  gradient: 'from-purple-500 to-pink-500'
                }
              ].map((feature, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-gradient-to-br from-white to-slate-50/50">
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto mb-6 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-800">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-slate-600 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section
          ref={reviewsRef}
          id="reviews"
          className={`py-20 lg:py-32 bg-white transition-all duration-700 ease-in-out ${reviewsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium mb-6">
                Loved by travelers worldwide
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8">
                <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  What Our Users Say
                </span>
              </h2>
              {/* Metric Badges */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-shadow duration-200">
                  50K+ Trips Planned
                </div>
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-shadow duration-200">
                  99.9% Uptime
                </div>
              </div>
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
              {[
                {
                  text: "TripBoard made planning our European vacation effortless. The budget tracking feature saved us from overspending, and collaborating with my travel partner was seamless.",
                  author: "Sarah M.",
                  role: "Frequent Traveler"
                },
                {
                  text: "The kanban interface is intuitive and beautiful. I love how I can track everything from flight bookings to restaurant reservations in one place.",
                  author: "Mike R.",
                  role: "Business Traveler"
                },
                {
                  text: "Planning our family reunion became stress-free with TripBoard. The collaboration features let everyone contribute, and we stayed within budget thanks to the smart tracking.",
                  author: "Jennifer L.",
                  role: "Family Trip Planner"
                }
              ].map((review, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30">
                  <CardHeader>
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <CardDescription className="text-slate-700 leading-relaxed text-base italic">
                      "{review.text}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                        {review.author.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{review.author}</p>
                        <p className="text-sm text-slate-500">{review.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="py-20 lg:py-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full bg-white/5 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-8">
              Ready to Plan Your Next Adventure?
            </h2>
            <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join thousands of travelers who trust TripBoard to organize their perfect trips. Start planning your dream vacation today.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                size="lg"
                onClick={handleRegisterNavigation}
                className="bg-white text-blue-600 hover:bg-blue-50 px-10 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Logo and Copyright */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                  <Plane className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">TripBoard</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Making travel planning simple and enjoyable for everyone.
              </p>
              <p className="text-slate-500 text-sm">
                © 2025 TripBoard. All rights reserved.
              </p>
            </div>
            {/* Company Links */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white text-lg">Company</h3>
              <div className="space-y-3">
                {['About Us', 'Contact'].map((item) => (
                  <a
                    key={item}
                    href={`/${item.toLowerCase().replace(' ', '-')}`}
                    className="block text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
            {/* Support Links */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white text-lg">Support</h3>
              <div className="space-y-3">
                {['Help Center', 'Privacy Policy', 'Terms of Service'].map((item) => (
                  <a
                    key={item}
                    href={`/${item.toLowerCase().replace(' ', '-')}`}
                    className="block text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
