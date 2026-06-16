'use client';

import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useForgotPasswordMutation } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const forgotPasswordMutation = useForgotPasswordMutation();

  function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setError(null);
    forgotPasswordMutation.mutate(values, {
      onSuccess: () => {
        setSuccess(true);
      },
      onError: (err: any) => {
        setError(
          err.response?.data?.message || 'Failed to submit request. Please try again.'
        );
      },
    });
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Forgot password?</h1>
          <p className="text-slate-500 text-sm">
            No worries, we&apos;ll send you instructions to reset your password.
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-md">
          {success ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">Check your email</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  We have sent a password reset link to <span className="font-medium text-slate-800">{form.getValues('email')}</span> if an account exists with this address.
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200/60">
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
                        <div className="relative">
                          <Input
                            type="email"
                            placeholder="admin@nivasalivin.com"
                            className="h-11 rounded-lg border-slate-200 bg-white pl-10 pr-4 shadow-sm focus-visible:ring-secondary focus-visible:border-secondary"
                            {...field}
                            disabled={forgotPasswordMutation.isPending}
                          />
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                            <Mail className="h-5 w-5" />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 mt-4 rounded-lg bg-primary hover:bg-primary/95 text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2"
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary transition-all hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </Link>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
