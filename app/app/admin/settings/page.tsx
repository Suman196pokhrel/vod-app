"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Video, Upload, Shield, Bell, Play, Database } from "lucide-react";
import { SettingSwitchItem } from "./_components/SettingsSwitchItem";

import { SettingsSection } from "./_components/SettingsSection";
import { SettingsInputItem } from "./_components/SettingsInputItem";
import { SettingSelectItem } from "./_components/SettingsSelectItem";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Video Upload Settings
    maxFileSize: "5",
    maxDuration: "120",
    allowedFormats: "mp4,mov,avi",
    autoTranscode: true,
    
    // Content Management
    requireApproval: false,
    defaultVisibility: "public",
    enableComments: true,
    moderateComments: false,
    
    // Streaming Settings
    defaultQuality: "1080p",
    adaptiveStreaming: true,
    bufferSize: "5",
    
    // Storage Settings
    storageLimit: "100",
    autoDeleteAfter: "never",
    compressionLevel: "medium",
    
    // User Settings
    allowRegistration: true,
    emailVerification: true,
    maxVideosPerUser: "unlimited",
    
    // Notifications
    notifyOnUpload: true,
    notifyOnComment: false,
    dailyReports: true,
    storageAlerts: true,
  });

  const handleSave = () => {
    console.log("Settings saved:", settings);
    // Add toast notification here
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure your VOD platform preferences
            </p>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>

        {/* Video Upload Settings */}
        <SettingsSection
          icon={Upload}
          iconColor="bg-blue-500"
          title="Video Upload Settings"
          description="Configure upload limits and file format restrictions"
        >
          <div className="grid grid-cols-2 gap-4">
            <SettingsInputItem
              id="maxFileSize"
              label="Max File Size"
              type="number"
              value={settings.maxFileSize}
              onChange={(value) => setSettings({ ...settings, maxFileSize: value })}
              suffix="GB"
            />
            <SettingsInputItem
              id="maxDuration"
              label="Max Video Duration"
              type="number"
              value={settings.maxDuration}
              onChange={(value) => setSettings({ ...settings, maxDuration: value })}
              suffix="minutes"
            />
          </div>
          
          <SettingsInputItem
            id="allowedFormats"
            label="Allowed Video Formats"
            value={settings.allowedFormats}
            onChange={(value) => setSettings({ ...settings, allowedFormats: value })}
            placeholder="e.g., mp4, mov, avi"
          />

          <SettingSwitchItem
            label="Auto-Transcode Videos"
            description="Automatically convert uploaded videos to multiple quality formats"
            checked={settings.autoTranscode}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, autoTranscode: checked })
            }
          />
        </SettingsSection>

        {/* Content Management */}
        <SettingsSection
          icon={Video}
          iconColor="bg-purple-500"
          title="Content Management"
          description="Control how videos are published and moderated"
        >
          <SettingSwitchItem
            label="Require Manual Approval"
            description="Videos need admin approval before being published to users"
            checked={settings.requireApproval}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, requireApproval: checked })
            }
          />

          <SettingSelectItem
            id="defaultVisibility"
            label="Default Video Visibility"
            value={settings.defaultVisibility}
            onValueChange={(value) =>
              setSettings({ ...settings, defaultVisibility: value })
            }
            options={[
              { value: "public", label: "Public - Visible to all users" },
              { value: "unlisted", label: "Unlisted - Only with link" },
              { value: "private", label: "Private - Only uploader" },
            ]}
          />

          <SettingSwitchItem
            label="Enable Comments"
            description="Allow users to comment on videos"
            checked={settings.enableComments}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, enableComments: checked })
            }
          />

          <SettingSwitchItem
            label="Moderate Comments"
            description="Comments require approval before being visible"
            checked={settings.moderateComments}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, moderateComments: checked })
            }
          />
        </SettingsSection>

        {/* Streaming Settings */}
        <SettingsSection
          icon={Play}
          iconColor="bg-green-500"
          title="Streaming & Playback"
          description="Configure video playback and streaming quality"
        >
          <SettingSelectItem
            id="defaultQuality"
            label="Default Playback Quality"
            value={settings.defaultQuality}
            onValueChange={(value) =>
              setSettings({ ...settings, defaultQuality: value })
            }
            options={[
              { value: "360p", label: "360p - Low" },
              { value: "480p", label: "480p - Standard" },
              { value: "720p", label: "720p - HD" },
              { value: "1080p", label: "1080p - Full HD" },
              { value: "4k", label: "4K - Ultra HD" },
            ]}
          />

          <SettingSwitchItem
            label="Adaptive Streaming"
            description="Automatically adjust quality based on user's connection"
            checked={settings.adaptiveStreaming}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, adaptiveStreaming: checked })
            }
          />

          <SettingsInputItem
            id="bufferSize"
            label="Buffer Size"
            type="number"
            value={settings.bufferSize}
            onChange={(value) => setSettings({ ...settings, bufferSize: value })}
            suffix="seconds"
          />
        </SettingsSection>

        {/* Storage Management */}
        <SettingsSection
          icon={Database}
          iconColor="bg-orange-500"
          title="Storage Management"
          description="Manage storage limits and data retention"
        >
          <SettingsInputItem
            id="storageLimit"
            label="Total Storage Limit"
            type="number"
            value={settings.storageLimit}
            onChange={(value) => setSettings({ ...settings, storageLimit: value })}
            suffix="GB"
          />

          <SettingSelectItem
            id="autoDeleteAfter"
            label="Auto-Delete Inactive Videos"
            value={settings.autoDeleteAfter}
            onValueChange={(value) =>
              setSettings({ ...settings, autoDeleteAfter: value })
            }
            options={[
              { value: "never", label: "Never" },
              { value: "30", label: "After 30 days of no views" },
              { value: "90", label: "After 90 days of no views" },
              { value: "180", label: "After 180 days of no views" },
            ]}
          />

          <SettingSelectItem
            id="compressionLevel"
            label="Video Compression Level"
            value={settings.compressionLevel}
            onValueChange={(value) =>
              setSettings({ ...settings, compressionLevel: value })
            }
            options={[
              { value: "low", label: "Low - Best Quality" },
              { value: "medium", label: "Medium - Balanced" },
              { value: "high", label: "High - Best Compression" },
            ]}
          />
        </SettingsSection>

        {/* User Registration */}
        <SettingsSection
          icon={Shield}
          iconColor="bg-red-500"
          title="User Registration & Access"
          description="Control user registration and account limits"
        >
          <SettingSwitchItem
            label="Allow User Registration"
            description="Let new users create accounts on the platform"
            checked={settings.allowRegistration}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, allowRegistration: checked })
            }
          />

          <SettingSwitchItem
            label="Email Verification Required"
            description="Users must verify email before accessing content"
            checked={settings.emailVerification}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, emailVerification: checked })
            }
          />

          <SettingSelectItem
            id="maxVideosPerUser"
            label="Max Videos Per User"
            value={settings.maxVideosPerUser}
            onValueChange={(value) =>
              setSettings({ ...settings, maxVideosPerUser: value })
            }
            options={[
              { value: "unlimited", label: "Unlimited" },
              { value: "10", label: "10 videos" },
              { value: "25", label: "25 videos" },
              { value: "50", label: "50 videos" },
              { value: "100", label: "100 videos" },
            ]}
          />
        </SettingsSection>

        {/* Admin Notifications */}
        <SettingsSection
          icon={Bell}
          iconColor="bg-yellow-500"
          title="Admin Notifications"
          description="Configure when you receive email notifications"
        >
          <SettingSwitchItem
            label="New Video Upload Notifications"
            description="Get notified when a user uploads a new video"
            checked={settings.notifyOnUpload}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, notifyOnUpload: checked })
            }
          />

          <SettingSwitchItem
            label="New Comment Notifications"
            description="Get notified when users comment on videos"
            checked={settings.notifyOnComment}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, notifyOnComment: checked })
            }
          />

          <SettingSwitchItem
            label="Daily Platform Reports"
            description="Receive daily summary of platform activity"
            checked={settings.dailyReports}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, dailyReports: checked })
            }
          />

          <SettingSwitchItem
            label="Storage Limit Alerts"
            description="Get notified when storage reaches 80% capacity"
            checked={settings.storageAlerts}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, storageAlerts: checked })
            }
          />
        </SettingsSection>

        {/* Save Button at Bottom */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} size="lg" className="gap-2">
            <Save className="w-4 h-4" />
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  );
}