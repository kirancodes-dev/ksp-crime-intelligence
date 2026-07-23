import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network/standalone';
import { Network as NetworkIcon, RefreshCw } from 'lucide-react';

interface NetworkNode {
  id: string;
  label: string;
  type: 'person' | 'case';
  group: 'gang' | 'accused' | 'case';
  score?: number;
  details?: string;
}

interface NetworkEdge {
  from: string;
  to: string;
  label: string;
  color?: { color: string };
  dashes?: boolean;
}

interface NetworkGraphProps {
  data: {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  };
  onNodeSelect?: (nodeId: string, type: 'person' | 'case') => void;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ data, onNodeSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const nodesList = data?.nodes || [];
    const edgesList = data?.edges || [];

    // Map raw nodes into vis-network visual options
    const formattedNodes = nodesList.map(node => {
      if (node.type === 'person') {
        const isGang = node.group === 'gang';
        const colorVal = node.score && node.score >= 0.7 
          ? '#ef4444' // Red for critical risk
          : isGang ? '#a855f7' : '#eab308'; // Purple for syndicate, Yellow for general
        
        return {
          id: node.id,
          label: node.label,
          shape: 'dot',
          borderWidth: 3,
          size: 20,
          color: {
            border: colorVal,
            background: '#111827',
            highlight: {
              border: '#ffffff',
              background: colorVal
            }
          },
          font: { color: '#f3f4f6', size: 11, face: 'Inter' },
          title: `<b>Accused:</b> ${node.label}<br/>${node.details || ''}`
        };
      } else {
        // Case node
        return {
          id: node.id,
          label: node.label,
          shape: 'box',
          margin: { top: 10, right: 10, bottom: 10, left: 10 },
          color: {
            border: '#3b82f6', // Blue
            background: '#0f172a',
            highlight: {
              border: '#ffffff',
              background: '#3b82f6'
            }
          },
          shapeProperties: {
            borderRadius: 6
          },
          borderWidth: 2,
          font: { color: '#f3f4f6', size: 10, face: 'Inter' },
          title: `<b>Case:</b> ${node.label}<br/>${node.details || ''}`
        };
      }
    });

    const formattedEdges = edgesList.map(edge => ({
      from: edge.from,
      to: edge.to,
      label: edge.label,
      font: { color: '#6c757d', size: 8, face: 'Inter', strokeWidth: 0 },
      color: edge.color || { color: '#475569' },
      width: 1.5,
      dashes: edge.dashes || false,
      arrows: 'to;from'
    }));

    const graphData = {
      nodes: formattedNodes,
      edges: formattedEdges
    };

    const options = {
      nodes: {
        scaling: {
          min: 16,
          max: 32
        }
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.5
        }
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 100,
          springConstant: 0.08
        },
        stabilization: {
          iterations: 100,
          fit: true
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        selectable: true
      }
    };

    // Instantiate vis Network
    networkRef.current = new Network(containerRef.current, graphData, options);

    // Event listener for node selection
    networkRef.current.on('doubleClick', (params: any) => {
      const selectedNodes = params.nodes;
      if (selectedNodes.length > 0) {
        const nodeId = selectedNodes[0];
        const rawNode = data.nodes.find(n => n.id === nodeId);
        if (rawNode && onNodeSelect) {
          // Pass the label/name back (e.g. accused name or FIR number)
          onNodeSelect(rawNode.label, rawNode.type);
        }
      }
    });

    // Cleanup
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [data, onNodeSelect]);

  const triggerResetPhysics = () => {
    if (networkRef.current) {
      networkRef.current.stabilize();
    }
  };

  return (
    <div className="card-panel rounded-lg border border-[#d1d9e6] p-6 text-[#1e3a5f] shadow-xl w-full my-4 relative">
      <div className="flex justify-between items-center border-b border-[#d1d9e6] pb-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f] flex items-center gap-2">
            <NetworkIcon className="text-[#1e3a5f]" size={20} /> Syndicate & Case Association Network
          </h2>
          <p className="text-xs text-[#6c757d] mt-0.5">Double-click nodes to expand risk profiles or inspection files</p>
        </div>
        
        {/* Reset physics button */}
        <button 
          onClick={triggerResetPhysics}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#f0f4f8] hover:bg-white border border-[#d1d9e6] hover:border-[#d1d9e6] text-[#2d4a6f] rounded-md text-xs font-semibold transition"
          title="Stabilize Graph Layout"
        >
          <RefreshCw size={12} /> Re-center
        </button>
      </div>

      {/* Network Container */}
      <div 
        ref={containerRef} 
        className="w-full h-96 min-h-[400px] rounded-lg border border-[#d1d9e6] bg-[#0d2137]/60 overflow-hidden cursor-grab active:cursor-grabbing"
      />

      {/* Network Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-[#6c757d] border-t border-slate-900 pt-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500 border border-white/20" />
          <span>Critical Offender (Risk &ge; 70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-yellow-500 border border-white/20" />
          <span>Accused Suspect</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-purple-500 border border-white/20" />
          <span>Syndicate Group Member</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-6 rounded bg-[#f0f4f8] border border-blue-500" />
          <span>FIR Case File</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="w-6 border-t-2 border-red-500 inline-block" />
          <span>Shared Accused Link</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 border-t-2 border-blue-500 inline-block" />
          <span>Modus Operandi Match</span>
        </div>
      </div>
    </div>
  );
};
