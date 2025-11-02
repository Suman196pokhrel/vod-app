"use client";

import { useState } from "react";
import { Users, TrendingUp, Clock, Activity } from "lucide-react";
import { StatCard } from "../_components/StatCard";
import { UserFilters } from "../_components/UserFilters";
import { UserTableRow, User } from "../_components/UserTableRow";

// Mock user data with business metrics
const mockUsers: User[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    role: "admin",
    status: "active",
    joinDate: "2024-01-15",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    videosWatched: 124,
    totalWatchTime: 45.5,
    lastActive: "2024-11-02",
    engagementScore: 85,
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "michael.chen@example.com",
    role: "user",
    status: "active",
    joinDate: "2024-02-20",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
    videosWatched: 67,
    totalWatchTime: 28.3,
    lastActive: "2024-11-01",
    engagementScore: 72,
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    email: "emily.r@example.com",
    role: "user",
    status: "active",
    joinDate: "2024-03-10",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
    videosWatched: 43,
    totalWatchTime: 19.7,
    lastActive: "2024-10-31",
    engagementScore: 68,
  },
  {
    id: 4,
    name: "James Wilson",
    email: "james.w@example.com",
    role: "user",
    status: "suspended",
    joinDate: "2024-01-28",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    videosWatched: 31,
    totalWatchTime: 12.1,
    lastActive: "2024-10-15",
    engagementScore: 38,
  },
  {
    id: 5,
    name: "Lisa Anderson",
    email: "lisa.anderson@example.com",
    role: "user",
    status: "active",
    joinDate: "2024-04-05",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    videosWatched: 89,
    totalWatchTime: 34.2,
    lastActive: "2024-11-02",
    engagementScore: 78,
  },
  {
    id: 6,
    name: "David Martinez",
    email: "david.m@example.com",
    role: "user",
    status: "inactive",
    joinDate: "2024-02-14",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    videosWatched: 5,
    totalWatchTime: 2.1,
    lastActive: "2024-08-22",
    engagementScore: 15,
  },
  {
    id: 7,
    name: "Jessica Taylor",
    email: "jessica.t@example.com",
    role: "user",
    status: "active",
    joinDate: "2024-03-22",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica",
    videosWatched: 56,
    totalWatchTime: 23.8,
    lastActive: "2024-10-30",
    engagementScore: 64,
  },
  {
    id: 8,
    name: "Robert Kim",
    email: "robert.kim@example.com",
    role: "user",
    status: "active",
    joinDate: "2024-01-08",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
    videosWatched: 142,
    totalWatchTime: 58.6,
    lastActive: "2024-11-02",
    engagementScore: 92,
  },
];

export default function UsersPage() {
  const [users] = useState<User[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Business metrics
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    totalWatchTime: users.reduce((sum, u) => sum + u.totalWatchTime, 0),
    avgEngagement:
      users.reduce((sum, u) => sum + u.engagementScore, 0) / users.length,
  };

  // Action handlers
  const handleEdit = (userId: number) => {
    console.log("Edit user:", userId);
  };

  const handleSuspend = (userId: number) => {
    console.log("Suspend user:", userId);
  };

  const handleActivate = (userId: number) => {
    console.log("Activate user:", userId);
  };

  const handleDelete = (userId: number) => {
    console.log("Delete user:", userId);
  };

  const handleViewDetails = (userId: number) => {
    console.log("View details for user:", userId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">
            Manage users and track engagement metrics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            iconColor="bg-blue-500"
          />
          <StatCard
            title="Active Users"
            value={stats.activeUsers}
            icon={TrendingUp}
            iconColor="bg-green-500"
            valueColor="text-green-600"
          />
          <StatCard
            title="Total Watch Time"
            value={`${stats.totalWatchTime.toFixed(0)}h`}
            icon={Clock}
            iconColor="bg-purple-500"
          />
          <StatCard
            title="Avg Engagement"
            value={`${stats.avgEngagement.toFixed(0)}%`}
            icon={Activity}
            iconColor="bg-orange-500"
          />
        </div>

        {/* Search and Filters */}
        <UserFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Users Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    User
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Role
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Status
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Videos Watched
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Watch Time
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Engagement
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Last Active
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">
                    Joined
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    onEdit={handleEdit}
                    onSuspend={handleSuspend}
                    onActivate={handleActivate}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No users found</p>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Showing <span className="font-medium">{filteredUsers.length}</span>{" "}
            of <span className="font-medium">{users.length}</span> users
          </p>
          <p className="text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}