import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Ban, CheckCircle, Trash2, Eye } from "lucide-react";
import { RoleBadge } from "./RoleBadge";
import { StatusBadge } from "./StatusBadge";

export interface User {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended" | "inactive";
  joinDate: string;
  avatar: string;
  videosWatched: number;
  totalWatchTime: number; // in hours
  lastActive: string;
  engagementScore: number; // 0-100
}

interface UserTableRowProps {
  user: User;
  onEdit: (userId: number) => void;
  onSuspend: (userId: number) => void;
  onActivate: (userId: number) => void;
  onDelete: (userId: number) => void;
  onViewDetails: (userId: number) => void;
}

export function UserTableRow({
  user,
  onEdit,
  onSuspend,
  onActivate,
  onDelete,
  onViewDetails,
}: UserTableRowProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getEngagementColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="p-4">
        <RoleBadge role={user.role} />
      </td>
      <td className="p-4">
        <StatusBadge status={user.status} />
      </td>
      <td className="p-4">
        <p className="text-sm text-gray-900">{user.videosWatched}</p>
      </td>
      <td className="p-4">
        <p className="text-sm text-gray-900">{user.totalWatchTime}h</p>
      </td>
      <td className="p-4">
        <p className={`text-sm font-medium ${getEngagementColor(user.engagementScore)}`}>
          {user.engagementScore}%
        </p>
      </td>
      <td className="p-4">
        <p className="text-sm text-gray-600">{formatDate(user.lastActive)}</p>
      </td>
      <td className="p-4">
        <p className="text-sm text-gray-600">{formatDate(user.joinDate)}</p>
      </td>
      <td className="p-4">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-gray-200">
              <DropdownMenuItem
                onClick={() => onViewDetails(user.id)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(user.id)} className="gap-2">
                <Edit className="w-4 h-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              {user.status === "active" ? (
                <DropdownMenuItem
                  onClick={() => onSuspend(user.id)}
                  className="gap-2 text-yellow-600"
                >
                  <Ban className="w-4 h-4" />
                  Suspend User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => onActivate(user.id)}
                  className="gap-2 text-green-600"
                >
                  <CheckCircle className="w-4 h-4" />
                  Activate User
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem
                onClick={() => onDelete(user.id)}
                className="gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}