import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UnavailableFeature({ name }: { name: string }) {
  return (
    <div className="p-6" role="main">
      <Alert variant="destructive" className="max-w-2xl">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{name} is unavailable</AlertTitle>
        <AlertDescription>
          This capability is disabled in the Phase 1 safe baseline because its production implementation is incomplete. No operation was started and no data was changed.
        </AlertDescription>
      </Alert>
    </div>
  );
}
