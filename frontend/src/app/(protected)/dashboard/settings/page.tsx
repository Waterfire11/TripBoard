"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label"; // Use shadcn Label for consistency
import { toast } from "sonner";
import { useSession } from "@/store/useSession";
import { useDeleteUser } from "@/features/auth/hooks";

const settingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { user } = useSession();
  const { theme, setTheme } = useTheme();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      emailNotifications: true, 
      pushNotifications: false,
    },
  });

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      // Placeholder for notification settings update
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error(`Failed to update settings: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
      deleteUser(undefined, {
        onSuccess: () => toast.success("Account deleted successfully"),
        onError: (error) => toast.error(`Failed to delete account: ${error.message}`),
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="space-y-8" role="region" aria-label="Account settings">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Appearance</h2>
          <div className="flex items-center space-x-4">
            <Label htmlFor="theme-toggle">Theme</Label>
            <Switch
              id="theme-toggle"
              checked={theme === "dark"}
              onCheckedChange={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle dark mode"
            />
            <span>{theme === "dark" ? "Dark" : "Light"} Mode</span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Notifications</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-4">
                    <FormLabel>Email Notifications</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Toggle email notifications"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pushNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-4">
                    <FormLabel>Push Notifications</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Toggle push notifications"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting} aria-label="Save notification settings">
                {form.formState.isSubmitting ? "Saving..." : "Save"}
              </Button>
            </form>
          </Form>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
          <p>Delete your account permanently.</p>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            aria-label="Delete account"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </div>
      </div>
    </div>
  );
}