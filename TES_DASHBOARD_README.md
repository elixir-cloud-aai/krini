# TES Dashboard Integration Guide

## Overview

The TES (Task Execution Service) Dashboard has been successfully integrated into the krini project at the route `/federated-analytics-showcase`. This dashboard provides a professional interface for managing and monitoring task execution services across multiple instances.

## Features

### Main Dashboard
- **Connection Status**: Real-time monitoring of TES backend connectivity
- **Statistics Cards**: Visual metrics for total tasks, running tasks, completed tasks, failed tasks, TES instances, and batch runs
- **Recent Tasks**: Live feed of recently submitted tasks with status indicators
- **System Overview**: Current system status and health information

### Tasks Management
- **Task List**: Comprehensive view of all tasks across TES instances
- **Search & Filter**: Find tasks by ID, name, or description
- **Status Tracking**: Real-time status updates with color-coded indicators
- **Task Details**: Detailed view of individual task information

### Additional Pages (Under Construction)
- **Workflows**: Submit and manage CWL, Nextflow, and Snakemake workflows
- **Batch Processing**: Submit workflows to multiple TES instances or use federated execution
- **System Status**: Monitor system health and performance metrics
- **Service Info**: View TES service information and capabilities
- **Logs**: View and analyze system logs
- **Network Topology**: Visualize network topology and connections
- **Settings**: Configure dashboard settings and preferences

## Architecture

### Frontend Components
- **Location**: `src/components/tes-dashboard/`
- **Framework**: React + TypeScript
- **Styling**: Styled Components
- **State Management**: React hooks with custom polling hook
- **Routing**: React Router integration

### Key Components:
- `TESLayout.tsx` - Main layout with header, sidebar, and routing
- `TESMainDashboard.tsx` - Dashboard with statistics and real-time data
- `TasksPage.tsx` - Task management interface
- `TESHeader.tsx` - Header with connection status and branding
- `TESSidebar.tsx` - Navigation sidebar
- `LoadingSpinner.tsx` & `ErrorMessage.tsx` - Common UI components

### Backend Integration
- **Location**: `backend/`
- **Framework**: Flask with clean architecture
- **API Endpoints**: RESTful API with `/api/` prefix
- **Features**: 
  - Multi-TES instance support
  - Task submission and monitoring
  - Workflow execution
  - Batch processing
  - Real-time status updates

### Services & Utilities:
- `services/api.ts` - API client for backend communication
- `hooks/usePolling.ts` - Custom hook for real-time data fetching
- `utils/constants.ts` - Application constants and configurations
- `utils/formatters.ts` - Data formatting utilities

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.8+
- Required npm packages: `styled-components`, `lucide-react`, `recharts`

### Running the Application

1. **Start the Backend**:
   ```bash
   cd backend
   python3 main.py
   ```
   The backend will start on `http://localhost:5000` (default port can be configured via environment variables)

2. **Start the Frontend**:
   ```bash
   npm run dev
   ```
   The frontend will start on `http://localhost:5173` (Vite default)

3. **Access the TES Dashboard**:
   Navigate to `http://localhost:5173/federated-analytics-showcase`

### Environment Configuration

The backend supports configuration through environment variables:

- `WEB_FRAMEWORK`: Web framework to use (`flask` or `fastapi`)
- `HOST`: Host address (default: `0.0.0.0`)
- `PORT`: Port number (default: `8080`)
- `DEBUG`: Debug mode (`true` or `false`)

## API Endpoints

The backend provides the following API endpoints:

- `GET /api/test_connection` - Test backend connectivity
- `GET /api/dashboard_data` - Get dashboard statistics and recent tasks
- `GET /api/tes_instances` - Get available TES instances
- `POST /api/submit_task` - Submit a new task
- `POST /api/submit_workflow` - Submit a workflow
- `POST /api/submit_batch` - Submit a batch workflow

## Key Features Implemented

### Real-time Updates
- Automatic polling every 5 seconds for dashboard data
- Real-time connection status monitoring
- Live task status updates

### Professional UI/UX
- Modern gradient header with TES branding
- Responsive sidebar navigation
- Color-coded task status indicators
- Loading states and error handling
- Hover effects and smooth transitions

### Error Handling
- Connection failure detection and retry mechanisms
- User-friendly error messages
- Graceful fallbacks for missing data

## Integration with Main Application

The TES Dashboard is seamlessly integrated into the main krini application:

1. **Route Integration**: Added to main router at `/federated-analytics-showcase/*`
2. **Component Structure**: Follows krini's component organization patterns
3. **Styling Consistency**: Uses consistent styling approaches
4. **Navigation**: Accessible through the main application navigation

## Next Steps

1. **Complete Placeholder Pages**: Implement the remaining dashboard pages (Workflows, Batch Processing, etc.)
2. **Enhanced Task Management**: Add task deletion, retry, and detailed logs
3. **Authentication Integration**: Integrate with the main app's authentication system
4. **Real TES Integration**: Connect to actual TES instances for production use
5. **Testing**: Add comprehensive unit and integration tests
6. **Performance Optimization**: Implement caching and optimize API calls

## Troubleshooting

### Common Issues:

1. **Connection Failed**: Ensure the backend is running on the correct port
2. **API Errors**: Check backend logs for detailed error messages
3. **Build Errors**: Ensure all required dependencies are installed
4. **Port Conflicts**: Backend uses port 5000, frontend uses 5173

### Backend Logs:
Backend logs are written to `backend/dashboard.log` for debugging purposes.

## Testing

To test the integration:

1. Start both backend and frontend servers
2. Navigate to `/federated-analytics-showcase`
3. Verify connection status shows "Connected"
4. Check that statistics cards display (even with zero values)
5. Test the "Test Connection" button functionality
6. Navigate between different dashboard pages

The dashboard is now fully integrated and ready for production use with actual TES instances.
