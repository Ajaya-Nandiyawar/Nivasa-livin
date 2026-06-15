'use client';

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantQuery, useUpdateTenantMutation } from "@/hooks/useTenants";

const schema = z.object({
  full_name: z.string().min(2, "Full name required"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Enter a valid phone (e.g. +919876543210)"),
  email: z.string().email("Valid email required"),
  dob: z.string().min(1, "Date of birth required"),
  occupation: z.string().optional(),
  emergency_contact_name: z.string().min(2, "Emergency contact name required"),
  emergency_contact_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Valid emergency phone required"),
  permanent_address: z.string().min(5, "Address required"),
  aadhaar_number: z.string().regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits"),
  pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN").optional().or(z.literal("")),
  status: z.string().min(1, "Status required"),
});

type FormValues = z.infer<typeof schema>;

export default function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: tenant, isLoading } = useTenantQuery(id);
  const { mutate: updateTenant, isPending } = useUpdateTenantMutation();

  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      full_name: "", phone: "", email: "", dob: "",
      occupation: "", emergency_contact_name: "", emergency_contact_phone: "",
      permanent_address: "", aadhaar_number: "", pan_number: "", status: "ACTIVE",
    },
    mode: "onTouched",
  });

  useEffect(() => {
    if (tenant) {
      setValue("full_name", tenant.full_name || "");
      setValue("phone", tenant.phone || "");
      setValue("email", tenant.email || "");
      setValue("occupation", tenant.occupation || "");
      setValue("emergency_contact_name", tenant.emergency_contact_name || "");
      setValue("emergency_contact_phone", tenant.emergency_contact_phone || "");
      setValue("permanent_address", tenant.permanent_address || "");
      setValue("aadhaar_number", tenant.aadhaar_number || "");
      setValue("pan_number", tenant.pan_number || "");
      setValue("status", tenant.status || "ACTIVE");

      if (tenant.date_of_birth) {
        const formattedDate = new Date(tenant.date_of_birth).toISOString().split('T')[0];
        setValue("dob", formattedDate);
      }
    }
  }, [tenant, setValue]);

  const onSubmit = (data: FormValues) => {
    setServerError(null);
    updateTenant(
      {
        id,
        payload: {
          ...data,
          pan_number: data.pan_number || undefined,
        },
      },
      {
        onSuccess: () => {
          router.push(`/tenants/${id}`);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message;
          setServerError(Array.isArray(msg) ? msg.join(", ") : msg ?? "An error occurred. Please try again.");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/tenants/${id}`}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Edit Tenant</h1>
            <p className="text-muted-foreground text-sm">Update tenant profile and status details.</p>
          </div>
        </div>
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">Tenant Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name *" error={errors.full_name?.message}>
                <Input {...register("full_name")} placeholder="e.g. Rahul Sharma" />
              </Field>
              <Field label="Phone *" error={errors.phone?.message}>
                <Input {...register("phone")} placeholder="+919876543210" />
              </Field>
              <Field label="Email *" error={errors.email?.message}>
                <Input {...register("email")} type="email" placeholder="tenant@email.com" />
              </Field>
              <Field label="Date of Birth *" error={errors.dob?.message}>
                <Input {...register("dob")} type="date" />
              </Field>
              <Field label="Occupation" error={errors.occupation?.message}>
                <Input {...register("occupation")} placeholder="e.g. Software Engineer" />
              </Field>
              <Field label="Tenant Status *" error={errors.status?.message}>
                <Select
                  defaultValue={tenant?.status || "ACTIVE"}
                  onValueChange={(v) => setValue("status", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="NOTICE_PERIOD">Notice Period</SelectItem>
                    <SelectItem value="VACATED">Vacated</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Aadhaar Number *" error={errors.aadhaar_number?.message}>
                <Input {...register("aadhaar_number")} placeholder="12 digit number" maxLength={12} />
              </Field>
              <Field label="PAN Number" error={errors.pan_number?.message}>
                <Input {...register("pan_number")} placeholder="ABCDE1234F" className="uppercase" />
              </Field>
              <Field label="Emergency Contact Name *" error={errors.emergency_contact_name?.message}>
                <Input {...register("emergency_contact_name")} placeholder="Parent / Sibling name" />
              </Field>
              <Field label="Emergency Contact Phone *" error={errors.emergency_contact_phone?.message}>
                <Input {...register("emergency_contact_phone")} placeholder="+919876543210" />
              </Field>
              <Field label="Permanent Address *" error={errors.permanent_address?.message} className="md:col-span-2">
                <Input {...register("permanent_address")} placeholder="Full home address" />
              </Field>
            </div>

            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                {serverError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="outline" asChild>
                <Link href={`/tenants/${id}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                <Save className="h-4 w-4" />
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
