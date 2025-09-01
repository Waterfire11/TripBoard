"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "@/store/useSession";
import { auth } from "@/features/auth/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  email: z.string().email("Invalid email address"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, setUser } = useSession();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      // Split name into first_name and last_name
      const nameParts = data.name.trim().split(" ", 1);
      const backendData = {
        first_name: nameParts[0] || "",
        last_name: nameParts.length > 1 ? nameParts[1] : "",
        email: data.email,
      };

      const response = await auth.updateProfile(backendData);
      // Update session with new user data
      setUser(
        {
          id: response.user.id.toString(),
          email: response.user.email,
          name: `${response.user.first_name} ${response.user.last_name}`.trim(),
          createdAt: response.user.created_at,
        },
        auth.isAuthenticated() ? auth.isAuthenticated().toString() : user!.id
      );
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error(`Failed to update profile: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  if (!user) {
    return <div aria-live="polite" className="max-w-7xl mx-auto p-6">Loading profile...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <div className="space-y-4" role="region" aria-label="User profile">
        {!isEditing ? (
          <>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
            <Button onClick={() => setIsEditing(true)} aria-label="Edit profile">Edit Profile</Button>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} aria-required="true" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" aria-required="true" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex space-x-4">
                <Button type="submit" disabled={form.formState.isSubmitting} aria-label="Save profile changes">
                  {form.formState.isSubmitting ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} aria-label="Cancel editing">
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}