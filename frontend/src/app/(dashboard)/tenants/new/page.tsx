'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTenantMutation } from "@/hooks/useTenants";

// ─── Zod Schema matching CreateTenantDto exactly ──────────────────────────────
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
  bed_id: z.string().uuid("Valid bed ID required"),
  monthly_rent: z.coerce.number().min(1, "Monthly rent required"),
  security_deposit: z.coerce.number().min(0),
  check_in_date: z.string().min(1, "Check-in date required"),
  billing_date: z.coerce.number().min(1).max(28),
});

type FormValues = z.infer<typeof schema>;

const STEPS = ["Personal Info", "Allocation & Booking", "Review"];

export default function AddTenantPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { mutate: createTenant, isPending } = useCreateTenantMutation();

  const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      full_name: "", phone: "", email: "", dob: "",
      occupation: "", emergency_contact_name: "", emergency_contact_phone: "",
      permanent_address: "", aadhaar_number: "", pan_number: "",
      bed_id: "", monthly_rent: 0, security_deposit: 0,
      check_in_date: "", billing_date: 1,
    },
    mode: "onTouched",
  });

  const stepFields: Array<(keyof FormValues)[]> = [
    ["full_name", "phone", "email", "dob", "emergency_contact_name", "emergency_contact_phone", "permanent_address", "aadhaar_number"],
    ["bed_id", "monthly_rent", "security_deposit", "check_in_date", "billing_date"],
  ];

  const nextStep = async () => {
    const valid = await trigger(stepFields[currentStep]);
    if (valid) setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0));

  const onSubmit = (data: FormValues) => {
    setServerError(null);
    createTenant(
      {
        ...data,
        pan_number: data.pan_number || undefined,
      },
      {
        onSuccess: () => setSuccess(true),
        onError: (err: any) => {
          const msg = err?.response?.data?.message;
          setServerError(Array.isArray(msg) ? msg.join(", ") : msg ?? "An error occurred. Please try again.");
        },
      }
    );
  };

  // ─── Success Screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Tenant Onboarded!</h2>
        <p className="text-muted-foreground">The new tenant has been successfully added to the system.</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.push("/tenants")}>View All Tenants</Button>
          <Button variant="outline" onClick={() => { setSuccess(false); setCurrentStep(0); }}>Add Another</Button>
        </div>
      </div>
    );
  }

  const values = getValues();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tenants"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Add New Tenant</h1>
          <p className="text-muted-foreground text-sm">Onboard a new tenant to the PG.</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, index) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border-2 transition-colors ${
                index < currentStep
                  ? "border-primary bg-primary text-primary-foreground"
                  : index === currentStep
                  ? "border-primary text-primary bg-background"
                  : "border-border text-muted-foreground bg-background"
              }`}>
                {index < currentStep ? "✓" : index + 1}
              </div>
              <span className={`text-sm font-medium whitespace-nowrap ${index <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                {step}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 ${index < currentStep ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form Card */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Step 0: Personal Info */}
            {currentStep === 0 && (
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
            )}

            {/* Step 1: Allocation & Booking */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Bed ID (UUID) *" error={errors.bed_id?.message} className="md:col-span-2">
                  <Input {...register("bed_id")} placeholder="Paste the bed UUID from Rooms page" className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground mt-1">Go to Rooms → click a vacant bed → copy its ID.</p>
                </Field>
                <Field label="Check-in Date *" error={errors.check_in_date?.message}>
                  <Input {...register("check_in_date")} type="date" />
                </Field>
                <Field label="Billing Date (1–28) *" error={errors.billing_date?.message}>
                  <Input {...register("billing_date")} type="number" min="1" max="28" placeholder="e.g. 5" />
                </Field>
                <Field label="Monthly Rent (₹) *" error={errors.monthly_rent?.message}>
                  <Input {...register("monthly_rent")} type="number" min="0" placeholder="12000" />
                </Field>
                <Field label="Security Deposit (₹) *" error={errors.security_deposit?.message}>
                  <Input {...register("security_deposit")} type="number" min="0" placeholder="24000" />
                </Field>
              </div>
            )}

            {/* Step 2: Review */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <ReviewSection title="Personal Details">
                  <ReviewRow label="Name" value={values.full_name} />
                  <ReviewRow label="Phone" value={values.phone} />
                  <ReviewRow label="Email" value={values.email} />
                  <ReviewRow label="Date of Birth" value={values.dob} />
                  <ReviewRow label="Aadhaar" value={values.aadhaar_number ? `XXXX XXXX ${values.aadhaar_number.slice(-4)}` : "—"} />
                  <ReviewRow label="Emergency Contact" value={`${values.emergency_contact_name} (${values.emergency_contact_phone})`} />
                </ReviewSection>
                <ReviewSection title="Booking Details">
                  <ReviewRow label="Check-in Date" value={values.check_in_date} />
                  <ReviewRow label="Monthly Rent" value={`₹${Number(values.monthly_rent).toLocaleString("en-IN")}`} />
                  <ReviewRow label="Security Deposit" value={`₹${Number(values.security_deposit).toLocaleString("en-IN")}`} />
                  <ReviewRow label="Billing Date" value={`Day ${values.billing_date} of each month`} />
                </ReviewSection>
                {serverError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                    {serverError}
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 0}>
                Previous
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep}>Next Step</Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Complete Onboarding"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────
function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-lg p-4 border border-border/50">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
