import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

export interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps extends ViewProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
  onTabChange?: (tabId: string) => void;
}

export function Tabs({ tabs, defaultTab, className, onTabChange, ...props }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  function handleTabPress(id: string) {
    setActiveTab(id);
    onTabChange?.(id);
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <View style={cn(className || '')} {...props}>
      {/* Tab List */}
      <View style={cn('mb-4 flex-row border-b border-border')}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => handleTabPress(tab.id)}
            style={cn(`mr-4 border-b-2 px-1 pb-2 ${
              activeTab === tab.id ? 'border-primary' : 'border-transparent'
            }`)}
          >
            <Text
              style={cn(`font-medium ${
                activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground'
              }`)}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View>{activeTabContent}</View>
    </View>
  );
}
