'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
      // Store the access token in a cookie so middleware can read it
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
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border border-slate-200/80">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Login</CardTitle>
          <CardDescription className="text-slate-500">
            Enter your email and password to access the PG Management System.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                  {error}
                </div>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@nivasalivin.com" {...field} disabled={loginMutation.isPending} />
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
                    <FormLabel className="text-slate-700">Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={loginMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-6" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
