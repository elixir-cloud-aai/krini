/**
 * Network Discovery Service for TES Infrastructure
 * Dynamically discovers TES instances and monitors network topology
 */

export interface NetworkNode {
  id: string;
  type: 'tes' | 'storage' | 'gateway' | 'proxy';
  name: string;
  location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
    continent?: string;
  };
  endpoint: string;
  status: 'online' | 'offline' | 'degraded';
  lastSeen: Date;
  responseTime: number;
  capabilities: string[];
  metadata: Record<string, any>;
}

export interface NetworkConnection {
  id: string;
  source: string;
  target: string;
  type: 'workflow' | 'data_transfer' | 'control' | 'monitoring';
  status: 'active' | 'idle' | 'failed';
  bandwidth: number;
  latency: number;
  packetLoss: number;
  throughput: {
    current: number;
    average: number;
    peak: number;
  };
  metadata: Record<string, any>;
}

export interface NetworkTopology {
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  clusters: Array<{
    id: string;
    name: string;
    nodeIds: string[];
    region: string;
  }>;
  lastUpdated: Date;
}

export interface DiscoveryOptions {
  includeStorage: boolean;
  includeGateways: boolean;
  timeout: number;
  maxDepth: number;
  regions: string[];
}

// Known infrastructure registries and endpoints
const INFRASTRUCTURE_REGISTRIES = [
  'https://registry.elixir-europe.org/services',
  'https://biotools.readthedocs.io/en/latest/api_reference.html',
  'https://ga4gh-discovery.org'
];

// Known storage services that might be connected to TES
const KNOWN_STORAGE_SERVICES = [
  {
    id: 'storage-eu-central',
    name: 'EU Central Storage',
    endpoint: 'https://storage-eu.example.com/',
    location: { lat: 50.1109, lng: 8.6821, city: 'Frankfurt', country: 'Germany', continent: 'Europe' }
  },
  {
    id: 'storage-us-east',
    name: 'US East Storage',
    endpoint: 'https://storage-us.example.com/',
    location: { lat: 39.0458, lng: -76.6413, city: 'Ashburn', country: 'USA', continent: 'North America' }
  },
  {
    id: 'storage-asia-pacific',
    name: 'Asia Pacific Storage',
    endpoint: 'https://storage-ap.example.com/',
    location: { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan', continent: 'Asia' }
  }
];

class NetworkDiscoveryService {
  private static instance: NetworkDiscoveryService;
  private discoveredTopology: NetworkTopology | null = null;
  private discoveryPromise: Promise<NetworkTopology> | null = null;
  private readonly cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  public static getInstance(): NetworkDiscoveryService {
    if (!NetworkDiscoveryService.instance) {
      NetworkDiscoveryService.instance = new NetworkDiscoveryService();
    }
    return NetworkDiscoveryService.instance;
  }

  /**
   * Discover the complete network topology
   */
  async discoverNetworkTopology(options: Partial<DiscoveryOptions> = {}): Promise<NetworkTopology> {
    const opts: DiscoveryOptions = {
      includeStorage: true,
      includeGateways: true,
      timeout: 10000,
      maxDepth: 3,
      regions: ['EU', 'US', 'ASIA'],
      ...options
    };

    // Return cached result if available and fresh
    if (this.discoveredTopology && this.isTopologyFresh()) {
      return this.discoveredTopology;
    }

    // Return existing promise if discovery is in progress
    if (this.discoveryPromise) {
      return this.discoveryPromise;
    }

    this.discoveryPromise = this.performDiscovery(opts);
    
    try {
      this.discoveredTopology = await this.discoveryPromise;
      return this.discoveredTopology;
    } finally {
      this.discoveryPromise = null;
    }
  }

  /**
   * Perform the actual network discovery
   */
  private async performDiscovery(options: DiscoveryOptions): Promise<NetworkTopology> {
    const nodes: NetworkNode[] = [];
    const connections: NetworkConnection[] = [];
    
    // Use faster discovery phases in development
    const isDevelopment = typeof window !== 'undefined' && 
                         (window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1');

    // Phase 1: Discover TES instances (fast in dev)
    const tesNodes = await this.discoverTESNodes(options);
    nodes.push(...tesNodes);
    
    if (!isDevelopment) {
      // Only run slower phases in production
      
      // Phase 2: Discover storage services if enabled
      if (options.includeStorage) {
        const storageNodes = await this.discoverStorageNodes(options);
        nodes.push(...storageNodes);
      }

      // Phase 3: Discover gateways and proxies if enabled
      if (options.includeGateways) {
        const gatewayNodes = await this.discoverGatewayNodes(options);
        nodes.push(...gatewayNodes);
      }
    }

    // Phase 4: Discover connections between nodes (fast simulation)
    const discoveredConnections = await this.discoverConnections(nodes, options);
    connections.push(...discoveredConnections);

    // Phase 5: Identify clusters
    const clusters = this.identifyClusters(nodes, connections);

    const topology: NetworkTopology = {
      nodes,
      connections,
      clusters,
      lastUpdated: new Date()
    };

    return topology;
  }

  /**
   * Discover TES service nodes
   */
  private async discoverTESNodes(options: DiscoveryOptions): Promise<NetworkNode[]> {
    const nodes: NetworkNode[] = [];

    // Try to discover from known registries
    for (const registry of INFRASTRUCTURE_REGISTRIES) {
      try {
        const registryNodes = await this.queryServiceRegistry(registry, 'tes', options);
        nodes.push(...registryNodes);
      } catch (error) {
        console.warn(`Failed to query registry ${registry}:`, error);
      }
    }

    // Add known TES instances as fallback
    const fallbackNodes = await this.getFallbackTESNodes();
    
    // Merge discovered and fallback nodes, avoiding duplicates
    const nodeMap = new Map<string, NetworkNode>();
    [...nodes, ...fallbackNodes].forEach(node => {
      if (!nodeMap.has(node.id) || nodeMap.get(node.id)!.status === 'offline') {
        nodeMap.set(node.id, node);
      }
    });

    return Array.from(nodeMap.values());
  }

  /**
   * Discover storage service nodes using mock data
   */
  private async discoverStorageNodes(_options: DiscoveryOptions): Promise<NetworkNode[]> {
    const nodes: NetworkNode[] = [];

    for (const storage of KNOWN_STORAGE_SERVICES) {
      // Use mock data instead of making real network calls
      const isReachable = storage.id === 'storage-eu-central' ? 
        { reachable: true, responseTime: 80 } : 
        { reachable: Math.random() > 0.5, responseTime: Math.random() * 200 + 50 };
        
      const node: NetworkNode = {
        id: storage.id,
        type: 'storage',
        name: storage.name,
          location: storage.location,
          endpoint: storage.endpoint,
          status: isReachable.reachable ? 'online' : 'offline',
          lastSeen: new Date(),
          responseTime: isReachable.responseTime,
          capabilities: ['data-storage', 'bulk-transfer'],
          metadata: {
          storageType: this.inferStorageType(storage.endpoint),
          protocol: this.inferProtocol(storage.endpoint)
        }
      };

      nodes.push(node);
    }

    return nodes;
  }

  /**
   * Discover gateway and proxy nodes using mock data
   */
  private async discoverGatewayNodes(_options: DiscoveryOptions): Promise<NetworkNode[]> {
    const nodes: NetworkNode[] = [];

    // Use mock gateway data instead of making real network calls
    const mockGateways = [
      {
        id: 'demo-gateway-eu',
        name: 'EU Gateway (Demo)',
        endpoint: 'https://gateway-eu.example.com/',
        location: { lat: 50.0755, lng: 14.4378, city: 'Prague', country: 'Czech Republic', continent: 'Europe' },
        status: 'online',
        responseTime: 120
      },
      {
        id: 'demo-gateway-us',
        name: 'US Gateway (Demo)',
        endpoint: 'https://gateway-us.example.com/',
        location: { lat: 52.2053, lng: 0.1218, city: 'Cambridge', country: 'UK', continent: 'Europe' },
        status: 'online',
        responseTime: 95
      }
    ];

    for (const gateway of mockGateways) {
      const node: NetworkNode = {
        id: gateway.id,
        type: 'gateway',
        name: gateway.name,
        location: gateway.location,
        endpoint: gateway.endpoint,
        status: gateway.status as any,
        lastSeen: new Date(),
        responseTime: gateway.responseTime,
        capabilities: ['authentication', 'authorization', 'federation'],
        metadata: {
          gatewayType: 'federation',
          protocols: ['oauth2', 'oidc']
        }
      };

      nodes.push(node);
    }

    return nodes;
  }

  /**
   * Query a service registry for TES services
   */
  private async queryServiceRegistry(registryUrl: string, serviceType: string, _options: DiscoveryOptions): Promise<NetworkNode[]> {
    const cacheKey = `registry-${registryUrl}-${serviceType}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // This would be a real API call to the registry
      // For now, we'll simulate the response
      const nodes: NetworkNode[] = [];
      
      // Simulate registry response with some discovered services
      if (registryUrl.includes('elixir-europe.org')) {
        nodes.push({
          id: 'elixir-tes-discovered',
          type: 'tes',
          name: 'ELIXIR TES Service',
          location: { lat: 52.3676, lng: 4.9041, city: 'Amsterdam', country: 'Netherlands', continent: 'Europe' },
          endpoint: 'https://tes.elixir-europe.org/tes',
          status: 'online',
          lastSeen: new Date(),
          responseTime: Math.floor(Math.random() * 200) + 50,
          capabilities: ['ga4gh-tes-1.1', 'docker', 'singularity'],
          metadata: {
            organization: 'ELIXIR',
            version: '1.1.0'
          }
        });
      }

      this.setCache(cacheKey, nodes, 300000); // Cache for 5 minutes
      return nodes;

    } catch (error) {
      console.error(`Failed to query registry ${registryUrl}:`, error);
      return [];
    }
  }

  /**
   * Get fallback TES nodes (using mock data to avoid network errors)
   */
  private async getFallbackTESNodes(): Promise<NetworkNode[]> {
    // Use mock data instead of making real network calls to invalid endpoints
    const fallbackInstances = [
      {
        id: 'tes-csc-finland',
        name: 'CSC TESK Finland',
        endpoint: 'https://csc-tesk.rahtiapp.fi/ga4gh/tes/v1',
        location: { lat: 60.1699, lng: 24.9384, city: 'Helsinki', country: 'Finland', continent: 'Europe' }
      },
      {
        id: 'tes-ebi-uk',
        name: 'EBI TES UK',
        endpoint: 'https://tes.tsi.ebi.ac.uk/ga4gh/tes/v1',
        location: { lat: 52.0800, lng: 0.7700, city: 'Cambridge', country: 'United Kingdom', continent: 'Europe' }
      },
      {
        id: 'tes-demo-local',
        name: 'Demo TES Instance',
        endpoint: 'https://demo-tes.example.com/ga4gh/tes/v1',
        location: { lat: 52.5200, lng: 13.4050, city: 'Berlin', country: 'Germany', continent: 'Europe' }
      }
    ];

    const nodes: NetworkNode[] = [];

    for (const instance of fallbackInstances) {
      // Simulate reachability check without making actual network calls
      const isReachable = instance.id === 'tes-csc-finland' ? 
        { reachable: true, responseTime: 150 } : 
        { reachable: false, responseTime: 5000 };
        
      const node: NetworkNode = {
        id: instance.id,
        type: 'tes',
        name: instance.name,
        location: instance.location,
        endpoint: instance.endpoint,
        status: isReachable.reachable ? 'online' : 'offline',
        lastSeen: new Date(),
        responseTime: isReachable.responseTime,
        capabilities: ['ga4gh-tes-1.0', 'docker'],
        metadata: {
          discoveryMethod: 'fallback',
          confidence: 'medium'
        }
      };

      nodes.push(node);
    }

    return nodes;
  }

  /**
   * Discover connections between nodes
   */
  private async discoverConnections(nodes: NetworkNode[], options: DiscoveryOptions): Promise<NetworkConnection[]> {
    const connections: NetworkConnection[] = [];

    // Test connectivity between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const sourceNode = nodes[i];
        const targetNode = nodes[j];

        try {
          const connectionMetrics = await this.measureConnection(sourceNode, targetNode, options);
          
          if (connectionMetrics.isConnected) {
            const connection: NetworkConnection = {
              id: `${sourceNode.id}-${targetNode.id}`,
              source: sourceNode.id,
              target: targetNode.id,
              type: this.inferConnectionType(sourceNode, targetNode),
              status: connectionMetrics.status,
              bandwidth: connectionMetrics.bandwidth,
              latency: connectionMetrics.latency,
              packetLoss: connectionMetrics.packetLoss,
              throughput: connectionMetrics.throughput,
              metadata: {
                lastMeasured: new Date(),
                hops: connectionMetrics.hops
              }
            };

            connections.push(connection);
          }
        } catch (error) {
          console.warn(`Failed to measure connection between ${sourceNode.id} and ${targetNode.id}:`, error);
        }
      }
    }

    return connections;
  }

  /**
   * Check if a service is reachable (using fast simulation to avoid delays)
   */
  private async checkServiceReachability(endpoint: string, _timeout: number): Promise<{ reachable: boolean; responseTime: number }> {
    const startTime = Date.now();
    
    // Use fast simulation for development (10-50ms instead of 200ms)
    const isDevelopment = typeof window !== 'undefined' && 
                         (window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1');
    
    if (isDevelopment) {
      // Fast simulation for development
      await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 10));
    } else {
      // Slightly longer simulation for production demo
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    }
    
    // Simulate realistic reachability based on endpoint patterns
    let reachable = false;
    if (endpoint.includes('example.com')) {
      reachable = false; // Mock endpoints are always unreachable
    } else if (endpoint.includes('csc-tesk.rahtiapp.fi')) {
      reachable = true; // Known working endpoint
    } else {
      reachable = Math.random() > 0.4; // 60% chance for others
    }
    
    return { reachable, responseTime: Date.now() - startTime };
  }

  /**
   * Measure connection metrics between two nodes
   */
  private async measureConnection(
    source: NetworkNode, 
    target: NetworkNode, 
    _options: DiscoveryOptions
  ): Promise<{
    isConnected: boolean;
    status: 'active' | 'idle' | 'failed';
    bandwidth: number;
    latency: number;
    packetLoss: number;
    throughput: { current: number; average: number; peak: number };
    hops: number;
  }> {
    // In a real implementation, this would use network diagnostic tools
    // For simulation, we'll generate realistic metrics based on geographic distance
    
    const distance = this.calculateDistance(source.location, target.location);
    const baseLatency = Math.max(10, distance / 20); // Rough approximation
    
    // Simulate connection metrics
    const isConnected = Math.random() > 0.1; // 90% connection success rate
    const latency = baseLatency + Math.random() * 50;
    const bandwidth = Math.floor(Math.random() * 1000) + 100; // 100-1100 Mbps
    const packetLoss = Math.random() * 0.05; // 0-5% packet loss
    
    return {
      isConnected,
      status: isConnected ? (Math.random() > 0.7 ? 'active' : 'idle') : 'failed',
      bandwidth,
      latency,
      packetLoss,
      throughput: {
        current: bandwidth * (0.7 + Math.random() * 0.3),
        average: bandwidth * 0.6,
        peak: bandwidth * 0.95
      },
      hops: Math.ceil(distance / 1000) + Math.floor(Math.random() * 5)
    };
  }

  /**
   * Identify network clusters
   */
  private identifyClusters(nodes: NetworkNode[], _connections: NetworkConnection[]): Array<{
    id: string;
    name: string;
    nodeIds: string[];
    region: string;
  }> {
    const clusters: Array<{ id: string; name: string; nodeIds: string[]; region: string }> = [];
    
    // Group nodes by geographic region
    const regionGroups = new Map<string, NetworkNode[]>();
    
    nodes.forEach(node => {
      const region = node.location.continent || 'Unknown';
      if (!regionGroups.has(region)) {
        regionGroups.set(region, []);
      }
      regionGroups.get(region)!.push(node);
    });

    // Create clusters for each region with multiple nodes
    regionGroups.forEach((regionNodes, region) => {
      if (regionNodes.length > 1) {
        clusters.push({
          id: `cluster-${region.toLowerCase()}`,
          name: `${region} Cluster`,
          nodeIds: regionNodes.map(node => node.id),
          region
        });
      }
    });

    return clusters;
  }

  /**
   * Helper methods
   */
  private calculateDistance(loc1: { lat: number; lng: number }, loc2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private inferConnectionType(source: NetworkNode, target: NetworkNode): 'workflow' | 'data_transfer' | 'control' | 'monitoring' {
    if ((source.type === 'tes' && target.type === 'storage') || 
        (source.type === 'storage' && target.type === 'tes')) {
      return 'data_transfer';
    }
    if ((source.type === 'tes' && target.type === 'gateway') || 
        (source.type === 'gateway' && target.type === 'tes')) {
      return 'control';
    }
    if (source.type === 'tes' && target.type === 'tes') {
      return 'workflow';
    }
    return 'monitoring';
  }

  private inferStorageType(endpoint: string): string {
    if (endpoint.includes('ftp')) return 'ftp';
    if (endpoint.includes('s3') || endpoint.includes('amazonaws')) return 's3';
    if (endpoint.includes('google')) return 'gcs';
    if (endpoint.includes('azure')) return 'azure-blob';
    return 'http';
  }

  private inferProtocol(endpoint: string): string {
    if (endpoint.startsWith('ftp://')) return 'ftp';
    if (endpoint.startsWith('https://')) return 'https';
    if (endpoint.startsWith('http://')) return 'http';
    if (endpoint.startsWith('s3://')) return 's3';
    return 'unknown';
  }

  private isTopologyFresh(): boolean {
    if (!this.discoveredTopology) return false;
    const age = Date.now() - this.discoveredTopology.lastUpdated.getTime();
    return age < 300000; // 5 minutes
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  /**
   * Get current topology (cached if available)
   */
  getCurrentTopology(): NetworkTopology | null {
    return this.discoveredTopology;
  }

  /**
   * Clear cached topology
   */
  clearCache(): void {
    this.discoveredTopology = null;
    this.cache.clear();
  }
}

export default NetworkDiscoveryService.getInstance();
