import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  FileText,
  FileCheck,
  Settings,
  Eye,
  AlertCircle,
  Database,
  Cpu
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface SecurityStats {
  totalIncidents: number;
  openIncidents: number;
  criticalIncidents: number;
  complianceScore: number;
  certificatesExpiring: number;
  securityAssessments: number;
}

interface SecurityIncident {
  id: string;
  title: string;
  severity: string;
  status: string;
  detectedAt: Date;
  affectedSystems: string[];
}

interface CompliancePolicy {
  id: string;
  name: string;
  framework: string;
  complianceLevel: string;
  lastAssessed: Date;
}

interface Certificate {
  id: string;
  name: string;
  domain: string;
  expiresAt: Date;
  status: string;
}

function SecurityStatsCard({ title, value, icon: Icon, trend, color }: {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  color: string;
}) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <p className="text-xs text-muted-foreground mt-1">{trend}</p>
            )}
          </div>
          <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6 text-white group-hover:animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityIncidentsList({ incidents }: { incidents: SecurityIncident[] }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/10 text-red-700 border-red-200";
      case "high": return "bg-orange-500/10 text-orange-700 border-orange-200";
      case "medium": return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "low": return "bg-blue-500/10 text-blue-700 border-blue-200";
      default: return "bg-gray-500/10 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return AlertTriangle;
      case "investigating": return Eye;
      case "resolved": return CheckCircle;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-4">
      {incidents.map((incident) => {
        const StatusIcon = getStatusIcon(incident.status);
        return (
          <Card key={incident.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <StatusIcon className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold">{incident.title}</h4>
                    <Badge className={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Detected: {new Date(incident.detectedAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Affected: {incident.affectedSystems.join(", ")}
                  </p>
                </div>
                <Badge variant={incident.status === "resolved" ? "default" : "secondary"}>
                  {incident.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CompliancePoliciesList({ policies }: { policies: CompliancePolicy[] }) {
  const getComplianceColor = (level: string) => {
    switch (level) {
      case "compliant": return "bg-green-500/10 text-green-700 border-green-200";
      case "partial": return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "non_compliant": return "bg-red-500/10 text-red-700 border-red-200";
      default: return "bg-gray-500/10 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {policies.map((policy) => (
        <Card key={policy.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold">{policy.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Framework: {policy.framework}
                </p>
                <p className="text-sm text-muted-foreground">
                  Last assessed: {new Date(policy.lastAssessed).toLocaleDateString()}
                </p>
              </div>
              <Badge className={getComplianceColor(policy.complianceLevel)}>
                {policy.complianceLevel.replace("_", " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CertificatesList({ certificates }: { certificates: Certificate[] }) {
  const getExpiryColor = (expiresAt: Date) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return "bg-red-500/10 text-red-700 border-red-200";
    if (days <= 30) return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
    return "bg-green-500/10 text-green-700 border-green-200";
  };

  return (
    <div className="space-y-4">
      {certificates.map((cert) => {
        const daysUntilExpiry = Math.ceil((new Date(cert.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return (
          <Card key={cert.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold">{cert.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Domain: {cert.domain}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expires: {new Date(cert.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={getExpiryColor(cert.expiresAt)}>
                    {daysUntilExpiry} days
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">{cert.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Sample data - would come from API calls
  const securityStats: SecurityStats = {
    totalIncidents: 8,
    openIncidents: 3,
    criticalIncidents: 1,
    complianceScore: 87,
    certificatesExpiring: 2,
    securityAssessments: 5
  };

  const sampleIncidents: SecurityIncident[] = [
    {
      id: "1",
      title: "Unauthorized Access Attempt",
      severity: "high",
      status: "investigating",
      detectedAt: new Date(),
      affectedSystems: ["PXE Server", "Database"]
    },
    {
      id: "2", 
      title: "Certificate Expiry Warning",
      severity: "medium",
      status: "open",
      detectedAt: new Date(Date.now() - 86400000),
      affectedSystems: ["HTTPS Server"]
    },
    {
      id: "3",
      title: "Failed Login Attempts",
      severity: "low", 
      status: "resolved",
      detectedAt: new Date(Date.now() - 172800000),
      affectedSystems: ["Management Interface"]
    }
  ];

  const samplePolicies: CompliancePolicy[] = [
    {
      id: "1",
      name: "Access Control Policy",
      framework: "ISO27001",
      complianceLevel: "compliant",
      lastAssessed: new Date(Date.now() - 7 * 86400000)
    },
    {
      id: "2",
      name: "Data Protection Policy", 
      framework: "GDPR",
      complianceLevel: "partial",
      lastAssessed: new Date(Date.now() - 14 * 86400000)
    },
    {
      id: "3",
      name: "Network Security Policy",
      framework: "NIST",
      complianceLevel: "compliant", 
      lastAssessed: new Date(Date.now() - 5 * 86400000)
    }
  ];

  const sampleCertificates: Certificate[] = [
    {
      id: "1",
      name: "bootah.local SSL",
      domain: "bootah.local",
      expiresAt: new Date(Date.now() + 15 * 86400000),
      status: "active"
    },
    {
      id: "2",
      name: "API Gateway Certificate",
      domain: "api.bootah.local",
      expiresAt: new Date(Date.now() + 45 * 86400000),
      status: "active"
    }
  ];

  return (
    <>
      <Header 
        title="Security & Compliance Center" 
        description="Monitor security status, compliance metrics, and manage security policies" 
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-8" data-testid="security-page">
          {/* Security Stats Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <SecurityStatsCard
              title="Security Score"
              value={`${securityStats.complianceScore}%`}
              icon={Shield}
              trend="+2% from last month"
              color="from-green-500 to-emerald-600"
            />
            <SecurityStatsCard
              title="Open Incidents"
              value={securityStats.openIncidents}
              icon={AlertTriangle}
              trend={`${securityStats.criticalIncidents} critical`}
              color="from-red-500 to-pink-600"
            />
            <SecurityStatsCard
              title="Expiring Certificates"
              value={securityStats.certificatesExpiring}
              icon={FileCheck}
              trend="Next 30 days"
              color="from-yellow-500 to-orange-600"
            />
          </div>

          {/* Compliance Score Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Overall Compliance Score
              </CardTitle>
              <CardDescription>
                Aggregated compliance score across all frameworks and policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Current Score</span>
                  <span className="font-semibold">{securityStats.complianceScore}%</span>
                </div>
                <Progress value={securityStats.complianceScore} className="h-3" />
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="text-green-600 font-semibold">Good</p>
                    <p className="text-muted-foreground">85-100%</p>
                  </div>
                  <div>
                    <p className="text-yellow-600 font-semibold">Needs Attention</p>
                    <p className="text-muted-foreground">60-84%</p>
                  </div>
                  <div>
                    <p className="text-red-600 font-semibold">Critical</p>
                    <p className="text-muted-foreground">0-59%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="incidents">Incidents</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="certificates">Certificates</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Recent Security Incidents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SecurityIncidentsList incidents={sampleIncidents.slice(0, 3)} />
                    <Button variant="outline" className="w-full mt-4" data-testid="button-view-all-incidents">
                      View All Incidents
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Compliance Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CompliancePoliciesList policies={samplePolicies.slice(0, 2)} />
                    <Button variant="outline" className="w-full mt-4" data-testid="button-view-compliance">
                      View All Policies
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="incidents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Incidents</CardTitle>
                  <div className="flex gap-2">
                    <Button data-testid="button-create-incident">Create Incident</Button>
                    <Button variant="outline" data-testid="button-export-incidents">Export Report</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <SecurityIncidentsList incidents={sampleIncidents} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Policies</CardTitle>
                  <div className="flex gap-2">
                    <Button data-testid="button-create-policy">Create Policy</Button>
                    <Button variant="outline" data-testid="button-run-assessment">Run Assessment</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CompliancePoliciesList policies={samplePolicies} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="certificates" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>SSL/TLS Certificates</CardTitle>
                  <div className="flex gap-2">
                    <Button data-testid="button-add-certificate">Add Certificate</Button>
                    <Button variant="outline" data-testid="button-check-all-certs">Check All</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CertificatesList certificates={sampleCertificates} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}