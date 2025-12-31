import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ServerStatus, UpdateServerStatus } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateServerStatusSchema } from "@shared/schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Save, Server, Network, Shield, Globe } from "lucide-react";

export default function Configuration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: serverStatus, isLoading } = useQuery<ServerStatus>({
    queryKey: ["/api/server-status"],
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const form = useForm<UpdateServerStatus>({
    resolver: zodResolver(updateServerStatusSchema),
    defaultValues: {
      serverName: "Bootah64x-Server",
      pxeServerStatus: true,
      tftpServerStatus: true,
      httpServerStatus: true,
      dhcpProxyStatus: true,
      serverIp: "192.168.1.100",
      dhcpRangeStart: "192.168.1.100",
      dhcpRangeEnd: "192.168.1.200",
      subnetMask: "255.255.255.0",
      defaultGateway: "192.168.1.1",
      bootMode: "bios",
      bootTimeout: 30,
      tlsEncryption: true,
      macFiltering: false,
      pxePort: 67,
      tftpPort: 69,
      httpPort: 80,
      dhcpPort: 67,
      networkTraffic: 0,
    },
  });

  useEffect(() => {
    if (serverStatus && !isInitialized) {
      form.reset({
        serverName: serverStatus.serverName ?? "Bootah64x-Server",
        pxeServerStatus: serverStatus.pxeServerStatus ?? true,
        tftpServerStatus: serverStatus.tftpServerStatus ?? true,
        httpServerStatus: serverStatus.httpServerStatus ?? true,
        dhcpProxyStatus: serverStatus.dhcpProxyStatus ?? true,
        serverIp: serverStatus.serverIp ?? "192.168.1.100",
        dhcpRangeStart: serverStatus.dhcpRangeStart ?? "192.168.1.100",
        dhcpRangeEnd: serverStatus.dhcpRangeEnd ?? "192.168.1.200",
        subnetMask: serverStatus.subnetMask ?? "255.255.255.0",
        defaultGateway: serverStatus.defaultGateway ?? "192.168.1.1",
        bootMode: serverStatus.bootMode ?? "bios",
        bootTimeout: serverStatus.bootTimeout ?? 30,
        tlsEncryption: serverStatus.tlsEncryption ?? true,
        macFiltering: serverStatus.macFiltering ?? false,
        pxePort: serverStatus.pxePort ?? 67,
        tftpPort: serverStatus.tftpPort ?? 69,
        httpPort: serverStatus.httpPort ?? 80,
        dhcpPort: serverStatus.dhcpPort ?? 67,
        networkTraffic: serverStatus.networkTraffic ?? 0,
      });
      setIsInitialized(true);
    }
  }, [serverStatus, isInitialized, form]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: UpdateServerStatus) => {
      return apiRequest("PUT", "/api/server-status", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/server-status"] });
      toast({
        title: "Configuration Updated",
        description: "Server configuration has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateServerStatus) => {
    updateConfigMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <>
        <Header 
          title="Configuration" 
          description="Configure PXE server settings and network parameters" 
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Configuration" 
        description="Configure PXE server settings and network parameters" 
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Server Identity */}
            <Card>
              <CardHeader className="p-6 border-b border-border">
                <div className="flex items-center space-x-3">
                  <Server className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Server Identity</h3>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="serverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-server-name">Server Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Bootah64x-Server"
                          {...field}
                          value={field.value || ''}
                          data-testid="input-server-name"
                        />
                      </FormControl>
                      <FormDescription>
                        Friendly name for this PXE server instance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Server Services */}
            <Card>
              <CardHeader className="p-6 border-b border-border">
                <div className="flex items-center space-x-3">
                  <Server className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Server Services</h3>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base" data-testid="label-pxe-server">
                        PXE Server
                      </FormLabel>
                      <FormDescription>
                        Enable PXE boot service
                      </FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="pxeServerStatus"
                      render={({ field }) => (
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-pxe-server"
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="pxePort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-pxe-port">PXE Port</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="65535"
                            {...field}
                            value={field.value || ''}
                            onChange={e => field.onChange(parseInt(e.target.value) || 67)}
                            data-testid="input-pxe-port"
                          />
                        </FormControl>
                        <FormDescription>
                          Port for PXE boot service (default: 67)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base" data-testid="label-tftp-server">
                        TFTP Server
                      </FormLabel>
                      <FormDescription>
                        Enable TFTP file transfer service
                      </FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="tftpServerStatus"
                      render={({ field }) => (
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-tftp-server"
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="tftpPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-tftp-port">TFTP Port</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="65535"
                            {...field}
                            value={field.value || ''}
                            onChange={e => field.onChange(parseInt(e.target.value) || 69)}
                            data-testid="input-tftp-port"
                          />
                        </FormControl>
                        <FormDescription>
                          Port for TFTP file transfer (default: 69)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base" data-testid="label-http-server">
                        HTTP Server
                      </FormLabel>
                      <FormDescription>
                        Enable HTTP file serving
                      </FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="httpServerStatus"
                      render={({ field }) => (
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-http-server"
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="httpPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-http-port">HTTP Port</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="65535"
                            {...field}
                            value={field.value || ''}
                            onChange={e => field.onChange(parseInt(e.target.value) || 80)}
                            data-testid="input-http-port"
                          />
                        </FormControl>
                        <FormDescription>
                          Port for HTTP file serving (default: 80)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-lg border border-border p-4 space-y-4">
                  <div className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base" data-testid="label-dhcp-proxy">
                        DHCP Proxy
                      </FormLabel>
                      <FormDescription>
                        Enable DHCP proxy for PXE boot discovery
                      </FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="dhcpProxyStatus"
                      render={({ field }) => (
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-dhcp-proxy"
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="dhcpPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-dhcp-port">DHCP Proxy Port</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="65535"
                            {...field}
                            value={field.value || ''}
                            onChange={e => field.onChange(parseInt(e.target.value) || 67)}
                            data-testid="input-dhcp-port"
                          />
                        </FormControl>
                        <FormDescription>
                          Port for DHCP proxy service (default: 67)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Network Configuration */}
            <Card>
              <CardHeader className="p-6 border-b border-border">
                <div className="flex items-center space-x-3">
                  <Network className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Network Configuration</h3>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="serverIp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-server-ip">Server IP Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="192.168.1.100"
                          {...field}
                          value={field.value || ''}
                          data-testid="input-server-ip"
                        />
                      </FormControl>
                      <FormDescription>
                        IP address where the PXE server will bind
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="dhcpRangeStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-dhcp-range-start">DHCP Range Start</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="192.168.1.100"
                            {...field}
                            value={field.value || ''}
                            data-testid="input-dhcp-range-start"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dhcpRangeEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-dhcp-range-end">DHCP Range End</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="192.168.1.200"
                            {...field}
                            value={field.value || ''}
                            data-testid="input-dhcp-range-end"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="subnetMask"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-subnet-mask">Subnet Mask</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="255.255.255.0"
                            {...field}
                            value={field.value || ''}
                            data-testid="input-subnet-mask"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultGateway"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-default-gateway">Default Gateway</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="192.168.1.1"
                            {...field}
                            value={field.value || ''}
                            data-testid="input-default-gateway"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader className="p-6 border-b border-border">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Security Settings</h3>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="bootMode"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div>
                        <FormLabel className="text-base" data-testid="label-boot-mode">
                          Default Boot Mode
                        </FormLabel>
                        <FormDescription>
                          Configure default BIOS/UEFI boot mode for PXE deployments
                        </FormDescription>
                      </div>
                      <FormControl>
                        <div className="grid grid-cols-1 gap-3">
                          <div 
                            className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-accent ${field.value === 'bios' ? 'border-primary bg-accent' : 'border-border'}`}
                            onClick={() => field.onChange('bios')}
                            data-testid="option-bios"
                          >
                            <input 
                              type="radio" 
                              name="bootMode" 
                              value="bios" 
                              checked={field.value === 'bios'} 
                              onChange={() => field.onChange('bios')}
                              className="w-4 h-4" 
                              data-testid="radio-bios" 
                            />
                            <div>
                              <Label className="text-sm font-medium cursor-pointer" data-testid="label-bios">Legacy BIOS (MBR)</Label>
                              <p className="text-xs text-muted-foreground">Traditional boot method, maximum compatibility</p>
                            </div>
                          </div>
                          <div 
                            className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-accent ${field.value === 'uefi' ? 'border-primary bg-accent' : 'border-border'}`}
                            onClick={() => field.onChange('uefi')}
                            data-testid="option-uefi"
                          >
                            <input 
                              type="radio" 
                              name="bootMode" 
                              value="uefi" 
                              checked={field.value === 'uefi'}
                              onChange={() => field.onChange('uefi')}
                              className="w-4 h-4" 
                              data-testid="radio-uefi" 
                            />
                            <div>
                              <Label className="text-sm font-medium cursor-pointer" data-testid="label-uefi">UEFI (GPT)</Label>
                              <p className="text-xs text-muted-foreground">Modern boot method, required for newer systems</p>
                            </div>
                          </div>
                          <div 
                            className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-accent ${field.value === 'uefi-secure' ? 'border-primary bg-accent' : 'border-border'}`}
                            onClick={() => field.onChange('uefi-secure')}
                            data-testid="option-uefi-secure"
                          >
                            <input 
                              type="radio" 
                              name="bootMode" 
                              value="uefi-secure" 
                              checked={field.value === 'uefi-secure'}
                              onChange={() => field.onChange('uefi-secure')}
                              className="w-4 h-4" 
                              data-testid="radio-uefi-secure" 
                            />
                            <div>
                              <Label className="text-sm font-medium cursor-pointer" data-testid="label-uefi-secure">UEFI Secure Boot</Label>
                              <p className="text-xs text-muted-foreground">Enhanced security with signed bootloaders (Windows/UEFI certified systems)</p>
                            </div>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base" data-testid="label-tls-encryption">
                      TLS Encryption
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Encrypt image transfers over HTTPS
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="tlsEncryption"
                    render={({ field }) => (
                      <FormControl>
                        <Switch 
                          checked={field.value || false} 
                          onCheckedChange={field.onChange}
                          data-testid="switch-tls-encryption" 
                        />
                      </FormControl>
                    )}
                  />
                </div>

                <div className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base" data-testid="label-mac-filtering">
                      MAC Address Filtering
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Only allow authorized devices to boot
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="macFiltering"
                    render={({ field }) => (
                      <FormControl>
                        <Switch 
                          checked={field.value || false} 
                          onCheckedChange={field.onChange}
                          data-testid="switch-mac-filtering" 
                        />
                      </FormControl>
                    )}
                  />
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="bootTimeout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-boot-timeout">Boot Timeout (seconds)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="30"
                          min={5}
                          max={300}
                          {...field}
                          value={field.value || 30}
                          onChange={e => field.onChange(parseInt(e.target.value) || 30)}
                          data-testid="input-boot-timeout"
                        />
                      </FormControl>
                      <FormDescription>
                        Time to wait for PXE boot selection before timeout
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Storage Settings */}
            <Card>
              <CardHeader className="p-6 border-b border-border">
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Storage & Cloud Integration</h3>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="images-path" data-testid="label-images-path">Images Storage Path</Label>
                  <Input
                    id="images-path"
                    placeholder="C:\Bootah64x\Images"
                    defaultValue="C:\Bootah64x\Images"
                    data-testid="input-images-path"
                  />
                  <p className="text-sm text-muted-foreground">
                    Local directory where OS images are stored
                  </p>
                </div>

                <Separator />

                <div className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base" data-testid="label-cloud-sync">
                      Cloud Storage Sync
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Sync images with cloud storage (Azure, AWS, GCP)
                    </p>
                  </div>
                  <Switch defaultChecked={false} data-testid="switch-cloud-sync" />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="cloud-provider" data-testid="label-cloud-provider">Cloud Provider</Label>
                  <Input
                    id="cloud-provider"
                    placeholder="azure, aws, gcp"
                    defaultValue=""
                    data-testid="input-cloud-provider"
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="cloud-endpoint" data-testid="label-cloud-endpoint">Cloud Endpoint URL</Label>
                  <Input
                    id="cloud-endpoint"
                    placeholder="https://storage.azure.com/bootah64x"
                    defaultValue=""
                    data-testid="input-cloud-endpoint"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={updateConfigMutation.isPending}
                data-testid="button-save-configuration"
                className="px-8"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </>
  );
}
