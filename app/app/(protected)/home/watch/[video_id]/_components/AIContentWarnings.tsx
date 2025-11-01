// app/home/watch/[id]/_components/AIContentWarnings.tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Shield, AlertTriangle } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'

const AIContentWarnings = () => {
  const [skipSensitiveScenes, setSkipSensitiveScenes] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const warnings = [
    { type: "Violence", severity: "moderate", timestamp: "12:45 - 15:20" },
    { type: "Strong Language", severity: "mild", timestamp: "Throughout" },
    { type: "Intense Scenes", severity: "high", timestamp: "45:30 - 48:15" }
  ]

  const severityColors = {
    mild: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    moderate: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    high: "bg-red-500/10 text-red-600 border-red-500/20"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          AI Content Insights
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Content warnings detected by AI
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle for sensitive content */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Skip Sensitive Scenes</span>
          </div>
          <Switch
            checked={skipSensitiveScenes}
            onCheckedChange={setSkipSensitiveScenes}
          />
        </div>

        {/* Collapsible Warnings List */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold hover:underline">
            View Detailed Warnings
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-3">
            {warnings.map((warning, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="text-sm font-medium">{warning.type}</p>
                  <p className="text-xs text-muted-foreground">{warning.timestamp}</p>
                </div>
                <Badge variant="outline" className={severityColors[warning.severity as keyof typeof severityColors]}>
                  {warning.severity}
                </Badge>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

export default AIContentWarnings