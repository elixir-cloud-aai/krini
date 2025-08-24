# Data and Request Flow Visualization

This enhancement adds a new interactive map below the Workflow Topology Map that visualizes data flow and request/compute flow patterns in the TES ecosystem.

## Features

### 1. Dual Flow Visualization
- **Data Flow**: Shows how input data flows from storage services to TES instances and how output data is stored locally
- **Request/Compute Flow**: Shows how requests and compute tasks flow between TES instances
- **Combined View**: Shows both flows simultaneously (default)

### 2. Interactive Controls
- **Toggle Buttons**: Switch between "Both Flows", "Data Flow Only", and "Request Flow Only"
- **Refresh Button**: Manually refresh the flow visualization
- **Debug Buttons**: View raw data for troubleshooting

### 3. Visual Elements

#### TES Instances
- **Blue circular markers** with server icons
- Represent Task Execution Service instances
- Show popup with instance name and URL

#### Storage Services
- **Green circular markers** with database icons
- Represent storage services (S3, FTP, cloud storage, etc.)
- Show popup with service name and URL

#### Data Flow
- **Green dashed lines** from storage to TES instances (input data)
- **Green circular arrows** around TES instances (local output storage)
- Represents data movement patterns

#### Request/Compute Flow
- **Orange dashed lines** between TES instances
- **Orange circular patterns** showing request routing
- Represents task distribution and compute coordination

## Configuration

### Storage Locations
Storage services are configured in `storage_locations.json`:

```json
[
  {
    "name": "CESNET Storage",
    "type": "storage",
    "lat": 50.0755,
    "lon": 14.4378,
    "url": "https://storage.cesnet.cz",
    "description": "CESNET cloud storage service"
  }
]
```

### TES Locations
TES instances are configured in `tes_instance_locations.json` (existing file).

## Usage

1. **Start the dashboard**: `python tes_dashboard.py`
2. **Navigate to Overview tab**: The flow visualization is below the workflow topology map
3. **Use toggle buttons**: Switch between different flow views
4. **Click markers**: View detailed information about services
5. **Hover over flows**: See flow descriptions in popups

## Technical Implementation

### Map Initialization
- Uses Leaflet.js for interactive mapping
- Automatically loads TES and storage locations
- Supports both flow types with different visual styles

### Flow Patterns
- **Data Flow**: Simulates realistic data movement from storage to compute
- **Request Flow**: Shows task distribution and coordination patterns
- **Circular Arrows**: Represent local storage operations

### Responsive Design
- Works on desktop and mobile devices
- Adaptive layout with proper scaling
- Touch-friendly controls

## Customization

### Adding New Storage Services
1. Edit `storage_locations.json`
2. Add new entry with coordinates and metadata
3. Restart dashboard to see changes

### Modifying Flow Patterns
1. Edit the `drawDataFlow()` and `drawRequestFlow()` functions
2. Customize colors, line styles, and patterns
3. Add new flow types as needed

### Styling
- CSS variables control colors and appearance
- Marker styles defined in CSS classes
- Easy to customize for different themes

## Future Enhancements

- Real-time flow data from actual TES operations
- Animated flow patterns
- Performance metrics overlay
- Custom flow definitions
- Export flow diagrams
- Integration with monitoring systems 