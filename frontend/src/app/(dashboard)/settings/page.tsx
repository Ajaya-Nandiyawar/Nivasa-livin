'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Cookies from 'js-cookie';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
} from '@/hooks/useAuth';
import {
  User,
  Shield,
  Bell,
  UserPlus,
  Loader2,
  Check,
  X,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Sliders,
} from 'lucide-react';

// ─── Zod Validation Schemas ───────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  phone: z.string().optional().or(z.literal('')),
});

const securitySchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required.'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirm_password: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });

const createUserSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
  full_name: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['SUPER_ADMIN', 'PG_ADMIN', 'MANAGER', 'VIEWER']),
});

// ─── Settings Page Component ─────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Auth query
  const { data: meData, isLoading: isMeLoading } = useMeQuery();
  const user = meData?.user;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // State messages
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  
  // Password visible toggles
  const [showSecCurPass, setShowSecCurPass] = useState(false);
  const [showSecNewPass, setShowSecNewPass] = useState(false);
  const [showSecConfPass, setShowSecConfPass] = useState(false);
  const [showCreatePass, setShowCreatePass] = useState(false);

  // Forced logout overlay
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Form setups
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
    },
  });

  const securityForm = useForm<z.infer<typeof securitySchema>>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const createUserForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      phone: '',
      role: 'MANAGER',
    },
  });

  // Pre-populate profile form when user queries complete
  useEffect(() => {
    if (user) {
      profileForm.reset({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user, profileForm]);

  // Mutations
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const usersQuery = useUsersQuery(isSuperAdmin);
  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();

  // Watch security new password for strength requirements
  const newPasswordValue = securityForm.watch('new_password') || '';
  const requirements = [
    { re: /.{8,}/, label: 'At least 8 characters' },
    { re: /[A-Z]/, label: 'At least 1 uppercase letter' },
    { re: /[a-z]/, label: 'At least 1 lowercase letter' },
    { re: /[0-9]/, label: 'At least 1 number' },
  ];

  // Submit handlers
  const onProfileSubmit = (values: z.infer<typeof profileSchema>) => {
    setProfileSuccess(null);
    setProfileError(null);
    updateProfileMutation.mutate(values, {
      onSuccess: () => {
        setProfileSuccess('Profile updated successfully.');
      },
      onError: (err: any) => {
        setProfileError(err.response?.data?.message || 'Failed to update profile.');
      },
    });
  };

  const onSecuritySubmit = (values: z.infer<typeof securitySchema>) => {
    setSecuritySuccess(null);
    setSecurityError(null);
    changePasswordMutation.mutate(
      {
        current_password: values.current_password,
        new_password: values.new_password,
      },
      {
        onSuccess: () => {
          setSecuritySuccess('Password updated successfully. You will be logged out in 2 seconds...');
          securityForm.reset();
          setIsLoggingOut(true);
          setTimeout(() => {
            Cookies.remove('accessToken');
            router.push('/login');
          }, 2000);
        },
        onError: (err: any) => {
          setSecurityError(err.response?.data?.message || 'Incorrect current password or change failed.');
        },
      }
    );
  };

  const onCreateUserSubmit = (values: z.infer<typeof createUserSchema>) => {
    setUserSuccess(null);
    setUserError(null);
    createUserMutation.mutate(values, {
      onSuccess: () => {
        setUserSuccess(`Staff account for ${values.full_name} created successfully.`);
        createUserForm.reset({
          email: '',
          password: '',
          full_name: '',
          phone: '',
          role: 'MANAGER',
        });
      },
      onError: (err: any) => {
        setUserError(err.response?.data?.message || 'Failed to create user account.');
      },
    });
  };

  const toggleUserStatus = (userId: string, currentStatus: boolean) => {
    updateUserMutation.mutate({
      id: userId,
      payload: { is_active: !currentStatus },
    });
  };

  const updateUserRole = (userId: string, newRole: 'SUPER_ADMIN' | 'PG_ADMIN' | 'MANAGER' | 'VIEWER') => {
    updateUserMutation.mutate({
      id: userId,
      payload: { role: newRole },
    });
  };

  if (isMeLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl relative font-sans">
      {/* Forced Logout Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col justify-center items-center text-white">
          <div className="bg-slate-950/40 p-8 rounded-xl border border-slate-800 flex flex-col items-center gap-4 shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-secondary" />
            <h2 className="text-xl font-bold tracking-wide">Security Invalidation</h2>
            <p className="text-slate-400 text-sm text-center max-w-xs">
              Your password has been changed. Revoking active sessions and redirecting to the login portal...
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage profile, system security, preferences, and workspace users.</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs px-2.5 py-1">
            Role: {user?.role}
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1">
            Status: Active
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-slate-100 border border-slate-200/60 p-1 h-11 rounded-lg w-full sm:w-auto flex flex-wrap gap-1 sm:inline-flex justify-start">
          <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-slate-600 data-[state=active]:text-primary gap-2 h-9">
            <User className="h-4 w-4" />
            My Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-slate-600 data-[state=active]:text-primary gap-2 h-9">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-slate-600 data-[state=active]:text-primary gap-2 h-9">
              <UserPlus className="h-4 w-4" />
              User Management
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-slate-600 data-[state=active]:text-primary gap-2 h-9">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-slate-600 data-[state=active]:text-primary gap-2 h-9">
            <Sliders className="h-4 w-4" />
            System Preferences
          </TabsTrigger>
        </TabsList>

        {/* 1. My Profile Tab */}
        <TabsContent value="profile" className="focus-visible:ring-0">
          <Card className="border border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Personal Profile</CardTitle>
              <CardDescription>Update your personal information and contact details.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 max-w-xl">
                  {profileSuccess && (
                    <div className="p-3 text-sm text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
                      {profileSuccess}
                    </div>
                  )}
                  {profileError && (
                    <div className="p-3 text-sm text-red-800 bg-red-50 rounded-lg border border-red-200">
                      {profileError}
                    </div>
                  )}

                  <FormField
                    control={profileForm.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} disabled={updateProfileMutation.isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@nivasalivin.com" {...field} disabled={updateProfileMutation.isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your phone number (optional)" {...field} disabled={updateProfileMutation.isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button type="submit" className="bg-primary hover:bg-primary/95 text-white shadow-sm flex gap-2 items-center" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Profile Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Security Tab */}
        <TabsContent value="security" className="focus-visible:ring-0">
          <Card className="border border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Security &amp; Credentials</CardTitle>
              <CardDescription>Update your login password. Saving will force a session logout.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-4 max-w-xl">
                  {securitySuccess && (
                    <div className="p-3 text-sm text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
                      {securitySuccess}
                    </div>
                  )}
                  {securityError && (
                    <div className="p-3 text-sm text-red-800 bg-red-50 rounded-lg border border-red-200">
                      {securityError}
                    </div>
                  )}

                  <FormField
                    control={securityForm.control}
                    name="current_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showSecCurPass ? 'text' : 'password'}
                              placeholder="••••••••"
                              {...field}
                              disabled={changePasswordMutation.isPending}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                              onClick={() => setShowSecCurPass(!showSecCurPass)}
                            >
                              {showSecCurPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="new_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showSecNewPass ? 'text' : 'password'}
                              placeholder="••••••••"
                              {...field}
                              disabled={changePasswordMutation.isPending}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                              onClick={() => setShowSecNewPass(!showSecNewPass)}
                            >
                              {showSecNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Requirements List */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                    <span className="text-xs font-semibold text-slate-500 block mb-1">New Password Requirements</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {requirements.map((req, i) => {
                        const isValid = req.re.test(newPasswordValue);
                        return (
                          <div key={i} className="flex items-center gap-1.5 text-xs">
                            {isValid ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-slate-300 stroke-[3]" />
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
                    control={securityForm.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showSecConfPass ? 'text' : 'password'}
                              placeholder="••••••••"
                              {...field}
                              disabled={changePasswordMutation.isPending}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                              onClick={() => setShowSecConfPass(!showSecConfPass)}
                            >
                              {showSecConfPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button type="submit" className="bg-primary hover:bg-primary/95 text-white shadow-sm flex gap-2 items-center" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Update Password
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. User Management Tab (SUPER_ADMIN only) */}
        {isSuperAdmin && (
          <TabsContent value="users" className="focus-visible:ring-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Side: Create User Form */}
              <Card className="border border-slate-200/80 shadow-sm lg:col-span-1 h-fit">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Create Staff Account
                  </CardTitle>
                  <CardDescription>Setup administrative credentials for new team members.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...createUserForm}>
                    <form onSubmit={createUserForm.handleSubmit(onCreateUserSubmit)} className="space-y-4">
                      {userSuccess && (
                        <div className="p-3 text-sm text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
                          {userSuccess}
                        </div>
                      )}
                      {userError && (
                        <div className="p-3 text-sm text-red-800 bg-red-50 rounded-lg border border-red-200">
                          {userError}
                        </div>
                      )}

                      <FormField
                        control={createUserForm.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} disabled={createUserMutation.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createUserForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@nivasalivin.com" {...field} disabled={createUserMutation.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createUserForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+91 9988776655" {...field} disabled={createUserMutation.isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createUserForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temporary Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showCreatePass ? 'text' : 'password'}
                                  placeholder="••••••••"
                                  {...field}
                                  disabled={createUserMutation.isPending}
                                />
                                <button
                                  type="button"
                                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                                  onClick={() => setShowCreatePass(!showCreatePass)}
                                >
                                  {showCreatePass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createUserForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assigned Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={createUserMutation.isPending}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select staff role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SUPER_ADMIN">SUPER_ADMIN (All privileges)</SelectItem>
                                <SelectItem value="PG_ADMIN">PG_ADMIN (Property management)</SelectItem>
                                <SelectItem value="MANAGER">MANAGER (Daily operational task)</SelectItem>
                                <SelectItem value="VIEWER">VIEWER (Read-only access)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full bg-primary hover:bg-primary/95 text-white shadow-sm flex gap-2 items-center justify-center" disabled={createUserMutation.isPending}>
                        {createUserMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create Workspace Account
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Right Side: User Accounts List */}
              <Card className="border border-slate-200/80 shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-900">Active Accounts</CardTitle>
                  <CardDescription>Manage user roles and disable or enable accounts on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                  {usersQuery.isLoading ? (
                    <div className="flex h-48 justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  ) : !usersQuery.data?.users || usersQuery.data.users.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No workspace accounts found.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-100 shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-semibold text-slate-700">User</TableHead>
                            <TableHead className="font-semibold text-slate-700">Role</TableHead>
                            <TableHead className="font-semibold text-slate-700">Status</TableHead>
                            <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usersQuery.data.users.map((staff) => (
                            <TableRow key={staff.id} className="hover:bg-slate-50/50">
                              <TableCell className="align-middle">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-900">{staff.full_name}</span>
                                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Mail className="h-3 w-3 inline" /> {staff.email}
                                  </span>
                                  {staff.phone && (
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                      <Phone className="h-3 w-3 inline" /> {staff.phone}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="align-middle">
                                {staff.id === user.id ? (
                                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                                    {staff.role}
                                  </Badge>
                                ) : (
                                  <Select
                                    defaultValue={staff.role}
                                    onValueChange={(val: any) => updateUserRole(staff.id, val)}
                                    disabled={updateUserMutation.isPending}
                                  >
                                    <SelectTrigger className="w-[140px] h-8 text-xs font-semibold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                                      <SelectItem value="PG_ADMIN">PG_ADMIN</SelectItem>
                                      <SelectItem value="MANAGER">MANAGER</SelectItem>
                                      <SelectItem value="VIEWER">VIEWER</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell className="align-middle">
                                <Badge className={staff.is_active ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'}>
                                  {staff.is_active ? 'Active' : 'Disabled'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right align-middle">
                                {staff.id === user.id ? (
                                  <span className="text-xs text-slate-400 font-medium pr-3">Current User</span>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={`h-8 font-semibold text-xs transition-all ${staff.is_active ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200'}`}
                                    onClick={() => toggleUserStatus(staff.id, staff.is_active)}
                                    disabled={updateUserMutation.isPending}
                                  >
                                    {updateUserMutation.isPending && updateUserMutation.variables?.id === staff.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" />
                                    ) : staff.is_active ? (
                                      <>
                                        <UserX className="h-3 w-3 inline mr-1" />
                                        Disable
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="h-3 w-3 inline mr-1" />
                                        Enable
                                      </>
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* 4. Notifications Tab (Placeholder with switches) */}
        <TabsContent value="notifications" className="focus-visible:ring-0">
          <Card className="border border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Email &amp; Alert Notifications</CardTitle>
              <CardDescription>Configure warning alerts for key operational events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-xl">
              <div className="space-y-4">
                {[
                  {
                    title: "Rent Overdue Alerts",
                    desc: "Notify administrators and managers when a tenant's invoice is past due.",
                    enabled: true,
                  },
                  {
                    title: "URGENT Maintenance Tickets",
                    desc: "Dispatch instant email notifications when high priority issues are filed.",
                    enabled: true,
                  },
                  {
                    title: "Check-in / Check-out Logs",
                    desc: "Notify staff on booking events and check-out processing.",
                    enabled: false,
                  },
                  {
                    title: "Weekly Expense Reports",
                    desc: "Receive compilation reports summarizing properties expenditures.",
                    enabled: false,
                  },
                ].map(({ title, desc, enabled }) => (
                  <div key={title} className="flex justify-between items-start gap-4 p-4 border border-slate-100 rounded-lg hover:bg-slate-50/50 transition-all">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{desc}</p>
                    </div>
                    <div>
                      <input
                        type="checkbox"
                        defaultChecked={enabled}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-slate-300 text-secondary focus:ring-secondary accent-secondary"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <Button className="bg-primary hover:bg-primary/95 text-white shadow-sm flex items-center gap-1.5" onClick={() => alert('Preferences saved locally.')}>
                  Save Preference Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. System Preferences Tab (UI Mock) */}
        <TabsContent value="system" className="focus-visible:ring-0">
          <Card className="border border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">System Preferences</CardTitle>
              <CardDescription>Personalize the appearance and localized parameters of the console workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Interface Theme</label>
                <Select defaultValue="light" onValueChange={() => {}}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light Theme (Default Navy/Teal)</SelectItem>
                    <SelectItem value="dark">Dark Theme (Deep Slate/Ocean)</SelectItem>
                    <SelectItem value="system">Follow System Defaults</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Display Language</label>
                <Select defaultValue="en" onValueChange={() => {}}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (US)</SelectItem>
                    <SelectItem value="es">Spanish (Español)</SelectItem>
                    <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Local Currency</label>
                <Select defaultValue="inr" onValueChange={() => {}}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inr">Indian Rupee (₹)</SelectItem>
                    <SelectItem value="usd">US Dollar ($)</SelectItem>
                    <SelectItem value="eur">Euro (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button className="bg-primary hover:bg-primary/95 text-white shadow-sm" onClick={() => alert('Preferences saved locally.')}>
                  Apply Workspace Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
