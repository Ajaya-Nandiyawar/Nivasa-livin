'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useResetPasswordMutation } from '@/hooks/useAuth';
import { Loader2, Check, X, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

function ResetPasswordFormContent() {

  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const resetPasswordMutation = useResetPasswordMutation();
  const passwordValue = form.watch('password') || '';

  const requirements = [
    { re: /.{8,}/, label: 'At least 8 characters' },
    { re: /[A-Z]/, label: 'At least 1 uppercase letter' },
    { re: /[a-z]/, label: 'At least 1 lowercase letter' },
    { re: /[0-9]/, label: 'At least 1 number' },
  ];

  function onSubmit(values: z.infer<typeof passwordSchema>) {
    if (!token) {
      setError('Reset token is missing in URL.');
      return;
    }
    setError(null);
    resetPasswordMutation.mutate(
      {
        token,
        password: values.password,
      },
      {
        onSuccess: () => {
          setSuccess(true);
        },
        onError: (err: any) => {
          setError(
            err.response?.data?.message || 'The reset link is invalid or has expired.'
          );
        },
      }
    );
  }

  if (!token) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-md text-center space-y-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Missing Token</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            No valid reset token was found in the URL. Please verify your email link or request a new reset link.
          </p>
        </div>
        <div className="pt-4">
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-md">
      {success ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">Password Reset Complete</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your password has been successfully updated. You can now sign in using your new credentials.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/login" className="w-full">
              <Button className="w-full h-11 bg-primary hover:bg-primary/95 text-white font-medium rounded-lg shadow-sm">
                Go to login
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200/60 flex flex-col gap-2">
                <span className="font-semibold">Reset Failed</span>
                <span className="text-xs">{error}</span>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-primary underline mt-1"
                >
                  Request a new password reset link
                </Link>
              </div>
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="h-11 rounded-lg border-slate-200 bg-white pl-4 pr-11 shadow-sm focus-visible:ring-secondary focus-visible:border-secondary"
                        {...field}
                        disabled={resetPasswordMutation.isPending}
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

            {/* Live Password Strength Checklist */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Password Strength Checklist</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {requirements.map((req, i) => {
                  const isValid = req.re.test(passwordValue);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {isValid ? (
                        <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />
                      ) : (
                        <X className="h-4 w-4 text-slate-300 stroke-[3]" />
                      )}
                      <span className={isValid ? 'text-slate-600 font-medium' : 'text-slate-400'}>
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="h-11 rounded-lg border-slate-200 bg-white pl-4 pr-11 shadow-sm focus-visible:ring-secondary focus-visible:border-secondary"
                        {...field}
                        disabled={resetPasswordMutation.isPending}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-all focus:outline-none"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
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
              className="w-full h-11 mt-4 rounded-lg bg-primary hover:bg-primary/95 text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Set new password</h1>
          <p className="text-slate-500 text-sm">
            Choose a secure password that meets our strength requirements.
          </p>
        </div>

        <Suspense fallback={
          <div className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-md flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        }>
          <ResetPasswordFormContent />
        </Suspense>
      </div>
    </div>
  );
}
