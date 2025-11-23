import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, X, Edit2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DeviceGroup } from "@shared/schema";

interface GroupSelectorProps {
  selectedGroupId?: string;
  onGroupSelect: (groupId: string) => void;
}

export default function GroupSelector({ selectedGroupId, onGroupSelect }: GroupSelectorProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3b82f6");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery<DeviceGroup[]>({
    queryKey: ["/api/device-groups"],
    refetchInterval: 10000,
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/device-groups", {
        name: newGroupName,
        color: newGroupColor,
        description: "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-groups"] });
      setNewGroupName("");
      setNewGroupColor("#3b82f6");
      toast({
        title: "Group Created",
        description: "Device group created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create device group.",
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest("DELETE", `/api/device-groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/device-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      onGroupSelect("");
      toast({
        title: "Group Deleted",
        description: "Device group deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete device group.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold">Device Groups</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              data-testid="input-group-name"
            />
            <input
              type="color"
              value={newGroupColor}
              onChange={(e) => setNewGroupColor(e.target.value)}
              className="w-10 h-10 rounded border"
              data-testid="input-group-color"
            />
            <Button
              onClick={() => createGroupMutation.mutate()}
              disabled={!newGroupName || createGroupMutation.isPending}
              size="sm"
              data-testid="button-create-group"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading groups...</p>
            ) : !groups || groups.length === 0 ? (
              <p className="text-muted-foreground text-sm">No device groups created yet</p>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition ${
                    selectedGroupId === group.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => onGroupSelect(group.id)}
                  data-testid={`group-item-${group.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="font-medium">{group.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGroupMutation.mutate(group.id);
                    }}
                    data-testid={`button-delete-group-${group.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
