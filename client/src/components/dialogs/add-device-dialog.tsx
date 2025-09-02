import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertDeviceSchema, type InsertDevice } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

interface AddDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const deviceStatuses = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "idle", label: "Idle" },
];

const extendedDeviceSchema = insertDeviceSchema.extend({
  macAddress: insertDeviceSchema.shape.macAddress.refine(
    (mac) => /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac),
    { message: "Invalid MAC address format (use XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX)" }
  ),
  ipAddress: insertDeviceSchema.shape.ipAddress?.optional().refine(
    (ip) => !ip || /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip),
    { message: "Invalid IP address format" }
  ),
});

export default function AddDeviceDialog({ open, onOpenChange }: AddDeviceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<InsertDevice>({
    resolver: zodResolver(extendedDeviceSchema),
    defaultValues: {
      name: "",
      macAddress: "",
      ipAddress: "",
      status: "offline",
      manufacturer: "",
      model: "",
    },
  });

  const createDeviceMutation = useMutation({
    mutationFn: async (data: InsertDevice) => {
      return apiRequest("POST", "/api/devices", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Device Added",
        description: "The device has been added successfully to the network.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add device. Please check the information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDevice) => {
    createDeviceMutation.mutate({
      ...data,
      // Clean up optional fields
      ipAddress: data.ipAddress || null,
      manufacturer: data.manufacturer || null,
      model: data.model || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">Add New Device</DialogTitle>
          <DialogDescription>
            Manually register a device on the network for PXE deployment.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-device-name">Device Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="DESK-WS001"
                      {...field}
                      data-testid="input-device-name"
                    />
                  </FormControl>
                  <FormDescription>
                    A unique identifier for this device
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="macAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-mac-address">MAC Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00:1B:44:11:3A:B7"
                      {...field}
                      data-testid="input-mac-address"
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription>
                    Hardware MAC address (required for PXE booting)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ipAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-ip-address">IP Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="192.168.1.101"
                      {...field}
                      data-testid="input-ip-address"
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription>
                    Current or reserved IP address (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-device-status">Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-device-status">
                        <SelectValue placeholder="Select device status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {deviceStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-manufacturer">Manufacturer</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Dell, HP, Intel..."
                        {...field}
                        data-testid="input-manufacturer"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-model">Model</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="OptiPlex 7090"
                        {...field}
                        data-testid="input-model"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createDeviceMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createDeviceMutation.isPending}
                data-testid="button-add-device"
              >
                {createDeviceMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Add Device
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}