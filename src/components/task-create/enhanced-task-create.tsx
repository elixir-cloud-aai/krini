import React, { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../common/DashboardLayout';
import { ECCCLientGa4ghTesCreateRun } from '@elixir-cloud/tes/dist/react';
import { TaskCreateProps } from './types';
import { 
  FileText,
  Server,
  Zap,
  BookOpen,
  ExternalLink,
  Plus
} from 'lucide-react';

const EnhancedTaskCreateRuns: FC<TaskCreateProps> = ({ isLoggedIn, showToast }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn === 'false') {
      return navigate('/');
    }
  }, [isLoggedIn, navigate]);

  const refreshData = () => {
    setLoading(true);
    // Simulate refresh
    setTimeout(() => {
      setLoading(false);
      if (showToast) {
        showToast('success', 'Task creation interface refreshed');
      }
    }, 1000);
  };

  const renderQuickActions = () => (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center mb-3">
            <BookOpen className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-medium text-gray-900">Documentation</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Learn about TES task creation and execution</p>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
            View Docs <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center mb-3">
            <FileText className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="font-medium text-gray-900">Templates</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Use pre-built task templates for common workflows</p>
          <button 
            onClick={() => navigate('/run')}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            Browse Templates
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center mb-3">
            <Server className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="font-medium text-gray-900">TES Services</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">View available TES execution services</p>
          <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
            View Services
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center mb-3">
            <Zap className="w-5 h-5 text-orange-600 mr-2" />
            <h3 className="font-medium text-gray-900">Quick Start</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Get started with your first task in minutes</p>
          <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
            Start Tutorial
          </button>
        </div>
      </div>
    </div>
  );

  const renderTaskCreationInterface = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Enhanced Task Creation Form */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Plus className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                Save Draft
              </button>
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                Submit Task
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Configure and submit computational tasks for execution on TES services
          </p>
        </div>
        
        {/* TES Component Container */}
        <div className="p-6">
          <ECCCLientGa4ghTesCreateRun />
        </div>
      </div>

      {/* Help and Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">Tips for Task Creation</h3>
            <div className="mt-2 text-sm text-blue-800">
              <ul className="list-disc list-inside space-y-1">
                <li>Ensure your container images are publicly accessible or provide authentication</li>
                <li>Specify resource requirements (CPU, memory, disk) for optimal scheduling</li>
                <li>Use descriptive names and tags to easily identify your tasks later</li>
                <li>Test with small datasets before running large-scale computations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoggedIn === 'false') {
    return null;
  }

  return (
    <DashboardLayout
      title="Create Task Run"
      subtitle="Submit new computational tasks for execution"
      isLoading={loading}
      error={error}
      onRefresh={refreshData}
    >
      {renderTaskCreationInterface()}
    </DashboardLayout>
  );
};

export default EnhancedTaskCreateRuns;
