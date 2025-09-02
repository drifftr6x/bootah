import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Monitor, 
  Download, 
  Upload, 
  Zap, 
  Settings, 
  AlertCircle, 
  CheckCircle,
  Server,
  HardDrive,
  Network,
  Clock
} from "lucide-react";

export default function Help() {
  return (
    <>
      <Header 
        title="Help & Support" 
        description="Complete guide for PXE imaging operations and troubleshooting" 
      />
      
      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Quick Start Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-secondary" />
              <span>Quick Start Guide</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Bootah64x enables rapid OS deployment across multiple machines using PXE network booting. 
              Follow these workflows to capture, manage, and deploy system images efficiently.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Capture Image</h4>
                  <p className="text-sm text-muted-foreground">Create system image from reference machine</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Upload Image</h4>
                  <p className="text-sm text-muted-foreground">Add image to deployment library</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-semibold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Deploy Image</h4>
                  <p className="text-sm text-muted-foreground">Push image to target machines</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Capture Process */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-secondary" />
              <span>How to Capture System Images</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Always capture images from fully configured reference machines with all required software and settings.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-xs">1</span>
                  </div>
                  <span>Prepare Reference Machine</span>
                </h3>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">• Install and configure the operating system completely</p>
                  <p className="text-sm text-muted-foreground">• Install all required software, drivers, and applications</p>
                  <p className="text-sm text-muted-foreground">• Configure system settings, user accounts, and policies</p>
                  <p className="text-sm text-muted-foreground">• Run Windows Sysprep (for Windows) or prepare Linux for cloning</p>
                  <p className="text-sm text-muted-foreground">• Ensure machine is in a deployable state</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-xs">2</span>
                  </div>
                  <span>Boot from PXE Network</span>
                </h3>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">• Connect reference machine to the same network as PXE server</p>
                  <p className="text-sm text-muted-foreground">• Enable PXE boot in BIOS/UEFI settings</p>
                  <p className="text-sm text-muted-foreground">• Set network boot as first boot priority</p>
                  <p className="text-sm text-muted-foreground">• Restart machine and select "Capture Image" from PXE menu</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-xs">3</span>
                  </div>
                  <span>Configure Capture Settings</span>
                </h3>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">• Select source drive (usually C: for Windows)</p>
                  <p className="text-sm text-muted-foreground">• Choose compression level (higher = smaller file, longer time)</p>
                  <p className="text-sm text-muted-foreground">• Enter descriptive image name and description</p>
                  <p className="text-sm text-muted-foreground">• Specify network location to save the image file</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-semibold text-xs">4</span>
                  </div>
                  <span>Monitor Capture Progress</span>
                </h3>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">• Capture process typically takes 10-45 minutes depending on drive size</p>
                  <p className="text-sm text-muted-foreground">• Progress is shown in real-time with data transfer rates</p>
                  <p className="text-sm text-muted-foreground">• Do not power off machines during capture process</p>
                  <p className="text-sm text-muted-foreground">• Image file will be saved to specified network location</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Upload Process */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HardDrive className="w-5 h-5 text-secondary" />
              <span>How to Add Images to Library</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-xs">1</span>
                  </div>
                  <span>Access Image Management</span>
                </h3>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">• Navigate to "Images" section in the dashboard</p>
                  <p className="text-sm text-muted-foreground">• Click "Add Image" button to open upload dialog</p>
                  <p className="text-sm text-muted-foreground">• Ensure you have admin privileges for image management</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-xs">2</span>
                  </div>
                  <span>Upload Image File</span>
                </h3>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">• Drag and drop image file or click to browse</p>
                  <p className="text-sm text-muted-foreground">• Supported formats: .wim, .esd, .iso, .img</p>
                  <p className="text-sm text-muted-foreground">• Upload progress is displayed in real-time</p>
                  <p className="text-sm text-muted-foreground">• Large files may take significant time to upload</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-xs">3</span>
                  </div>
                  <span>Configure Image Metadata</span>
                </h3>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">• Enter descriptive name (e.g., "Windows 11 Pro + Office")</p>
                  <p className="text-sm text-muted-foreground">• Select operating system type (Windows, Linux, macOS)</p>
                  <p className="text-sm text-muted-foreground">• Add detailed description of included software</p>
                  <p className="text-sm text-muted-foreground">• Set version number for tracking updates</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deployment Process */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-secondary" />
              <span>How to Deploy Images to Machines</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Deployment will completely overwrite the target machine's hard drive. Ensure all important data is backed up.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-xs">1</span>
                  </div>
                  <span>Prepare Target Machines</span>
                </h3>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">• Ensure machines are connected to the same network</p>
                  <p className="text-sm text-muted-foreground">• Enable PXE boot in BIOS/UEFI settings</p>
                  <p className="text-sm text-muted-foreground">• Set network boot as first boot priority</p>
                  <p className="text-sm text-muted-foreground">• Record MAC addresses for device identification</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-xs">2</span>
                  </div>
                  <span>Start Deployment</span>
                </h3>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">• Go to "Deployments" page and click "New Deployment"</p>
                  <p className="text-sm text-muted-foreground">• Select target device(s) from discovered devices</p>
                  <p className="text-sm text-muted-foreground">• Choose OS image from your library</p>
                  <p className="text-sm text-muted-foreground">• Configure deployment options (partition scheme, drivers)</p>
                  <p className="text-sm text-muted-foreground">• Review settings and click "Start Deployment"</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-xs">3</span>
                  </div>
                  <span>Boot Target Machines</span>
                </h3>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">• Power on or restart target machines</p>
                  <p className="text-sm text-muted-foreground">• Machines will boot from network automatically</p>
                  <p className="text-sm text-muted-foreground">• Select "Deploy Image" from PXE boot menu</p>
                  <p className="text-sm text-muted-foreground">• Deployment begins automatically once connected</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-semibold text-xs">4</span>
                  </div>
                  <span>Monitor Progress</span>
                </h3>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">• Track real-time deployment progress in dashboard</p>
                  <p className="text-sm text-muted-foreground">• Typical deployment time: 15-60 minutes per machine</p>
                  <p className="text-sm text-muted-foreground">• Multiple machines can be deployed simultaneously</p>
                  <p className="text-sm text-muted-foreground">• Machines will automatically reboot when complete</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-secondary" />
              <span>System Requirements</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center space-x-2">
                  <Server className="w-4 h-4" />
                  <span>PXE Server Requirements</span>
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Windows Server 2016+ or Linux with DHCP</li>
                  <li>• Gigabit network interface</li>
                  <li>• Sufficient storage for images (50GB+ recommended)</li>
                  <li>• DHCP server or proxy DHCP capability</li>
                  <li>• TFTP and HTTP/FTP services</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>Target Machine Requirements</span>
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• PXE-capable network adapter</li>
                  <li>• UEFI or BIOS with network boot support</li>
                  <li>• Minimum 4GB RAM (8GB+ recommended)</li>
                  <li>• Network connection to PXE server</li>
                  <li>• Compatible hardware for target OS</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-secondary" />
              <span>Common Issues & Solutions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="border-l-4 border-yellow-400 pl-4">
                <h4 className="font-semibold text-yellow-700">Machine Not Appearing in Device List</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  • Verify PXE is enabled in BIOS/UEFI settings<br/>
                  • Check network cable connections<br/>
                  • Ensure machine is on same network/VLAN as PXE server<br/>
                  • Verify DHCP is providing IP addresses
                </p>
              </div>

              <div className="border-l-4 border-red-400 pl-4">
                <h4 className="font-semibold text-red-700">Deployment Fails or Stops</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  • Check image file integrity and format<br/>
                  • Verify sufficient storage space on target drive<br/>
                  • Ensure stable network connection<br/>
                  • Check for hardware compatibility issues
                </p>
              </div>

              <div className="border-l-4 border-blue-400 pl-4">
                <h4 className="font-semibold text-blue-700">Slow Transfer Speeds</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  • Use gigabit network infrastructure<br/>
                  • Limit concurrent deployments (max 5-10)<br/>
                  • Check network congestion and bandwidth<br/>
                  • Consider using multicast for large deployments
                </p>
              </div>

              <div className="border-l-4 border-green-400 pl-4">
                <h4 className="font-semibold text-green-700">Post-Deployment Issues</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  • Run Windows activation if using volume licensing<br/>
                  • Install/update drivers specific to hardware<br/>
                  • Configure network settings and domain join<br/>
                  • Apply security updates and patches
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-secondary" />
              <span>Best Practices</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Image Management</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Create separate images for different hardware types</li>
                  <li>• Use descriptive naming conventions</li>
                  <li>• Regularly update images with security patches</li>
                  <li>• Test images on sample hardware before mass deployment</li>
                  <li>• Maintain version control and documentation</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Deployment Strategy</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Schedule deployments during off-hours</li>
                  <li>• Deploy in batches to manage network load</li>
                  <li>• Have rollback plan and backup images ready</li>
                  <li>• Document deployment configurations</li>
                  <li>• Train staff on troubleshooting procedures</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}