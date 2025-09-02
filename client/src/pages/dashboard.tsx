import Header from "@/components/layout/header";
import StatsCards from "@/components/dashboard/stats-cards";
import DeploymentsTable from "@/components/dashboard/deployments-table";
import RecentActivity from "@/components/dashboard/recent-activity";
import NetworkStatus from "@/components/dashboard/network-status";

export default function Dashboard() {
  return (
    <>
      <Header 
        title="Dashboard" 
        description="Monitor PXE deployments and system status" 
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        <StatsCards />
        <DeploymentsTable />
        
        {/* Recent Activity & Network Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <RecentActivity />
          <NetworkStatus />
        </div>
      </main>
    </>
  );
}
