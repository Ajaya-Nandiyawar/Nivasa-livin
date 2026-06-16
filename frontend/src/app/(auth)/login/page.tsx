'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/axios';
import { Eye, EyeOff, Loader2, CheckCircle2, Building2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: z.infer<typeof loginSchema>) => {
      const response = await apiClient.post('/auth/login', values);
      return response.data;
    },
    onSuccess: (data) => {
      Cookies.set('accessToken', data.accessToken, { expires: 1 }); // 1 day
      router.push('/dashboard');
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || 'Invalid email or password. Please try again.'
      );
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    setError(null);
    loginMutation.mutate(values);
  }

  return (
    <div className="flex min-h-screen w-full font-sans bg-slate-50">
      {/* Left Panel: Brand & Info (Hidden on Mobile) */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-slate-900 p-12 text-white lg:flex bg-gradient-to-br from-slate-900 via-primary to-slate-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-white shadow-md">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-wider">NIVASA</span>
        </div>

        <div className="relative z-10 space-y-6 my-auto max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight lg:text-5xl">
            Smarter Living, Managed Better.
          </h1>
          <p className="text-lg text-slate-300">
            Nivasa is a complete operational suite for premium PG and hostel accommodations, keeping tenants, rent, and maintenance in perfect sync.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
              <span className="text-slate-200">Automated Rent &amp; Balance Tracking</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
              <span className="text-slate-200">One-click Tenant Onboarding</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-secondary shrink-0" />
              <span className="text-slate-200">Real-time Maintenance Dispatch</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-slate-400">
          &copy; {new Date().getFullYear()} Nivasa PG Management. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="space-y-2">
            {/* Small Logo for mobile */}
            <div className="flex lg:hidden items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-wider text-slate-900">NIVASA</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-sm">
              Please enter your credentials to access the admin workspace.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200/60 shadow-sm transition-all duration-300">
                  {error}
                </div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@nivasalivin.com"
                        className="h-11 rounded-lg border-slate-200 bg-white px-4 shadow-sm focus-visible:ring-secondary focus-visible:border-secondary"
                        {...field}
                        disabled={loginMutation.isPending}
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
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-slate-700 font-medium">Password</FormLabel>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-semibold text-secondary hover:text-secondary/80 hover:underline transition-all"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="h-11 rounded-lg border-slate-200 bg-white pl-4 pr-11 shadow-sm focus-visible:ring-secondary focus-visible:border-secondary"
                          {...field}
                          disabled={loginMutation.isPending}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-all focus:outline-none"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 mt-6 rounded-lg bg-primary hover:bg-primary/95 text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

